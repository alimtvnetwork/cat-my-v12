import { ClientLogger } from "@/lib/observability/client-logger";
/**
 * Plan 90 Step 78 — `IpcErrorBridge`.
 *
 * Binds the FE Global Error Modal (`spec/03-error-manage/02-error-architecture/04-error-modal/`)
 * to the CLI IPC transport (`spec/03-error-manage/` + Plan 90 IPC mailboxes).
 *
 * Root cause the binding fixes: before this component, an `Error` IPC frame
 * with `Envelope.Errors[]` written by worker-cli or processing-cli into the
 * `main-in` mailbox was ONLY visible if an operator opened
 * `/observability/sessions/{id}/ipc` and manually scrolled. The Global
 * Error Modal never fired for CLI failures, so cross-process errors were
 * silent from the main app's point of view. Explicit spec violation:
 * `spec/03-error-manage/02-error-architecture/04-error-modal/03-error-modal-reference.md §5`
 * requires the modal to surface any Errors[]-bearing envelope, without
 * qualifying "only when produced by BE HTTP".
 *
 * How it works:
 *   1. Poll `getObservabilitySessions({ status: "active" })` every
 *      `POLL_MS` to discover live CLI invocations.
 *   2. For each active invocation, poll `getObservabilitySessionIpc`
 *      on the `main-in` mailbox with `afterMsgId` cursor pinned per
 *      invocation so no frame is re-fired.
 *   3. For every item whose `Kind === "Error"` with a non-empty
 *      `Envelope.Errors[]`, push into `useErrorStore.captureError`.
 *   4. Bridge failures NEVER call `captureError` themselves — that would
 *      loop when the BE is down. Instead they log a single warn line
 *      and back off, per `spec/03-error-manage/` observability rule
 *      (surface loudly in logs, do not swallow, do not amplify).
 *
 * SSR-safe: all effects are client-only (`useEffect`). Never imports
 * `@/integrations/supabase/client.server` (would leak service key).
 */
import { useEffect, useRef } from "react";

import { useErrorStore } from "@/lib/stores/errorStore";
import { getObservabilitySessions } from "@/lib/observability/sessions.functions";
import { getObservabilitySessionIpc } from "@/lib/observability/ipc.functions";

const POLL_MS = 4000;
// Hard ceiling so a run-away CLI cannot make us fan-out unboundedly.
const MAX_ACTIVE_INVOCATIONS = 25;

type EnvelopeError = { Code?: unknown; Message?: unknown };

type IpcErrorEnvelope = {
  Status?: { IsSuccess?: unknown };
  Errors?: EnvelopeError[] | EnvelopeError;
  CorrelationId?: unknown;
};

type IpcErrorItem = {
  MsgId?: unknown;
  Kind?: unknown;
  Envelope?: IpcErrorEnvelope;
  CorrelationId?: unknown;
  Source?: unknown;
};

function firstEnvelopeError(env: IpcErrorEnvelope | undefined): EnvelopeError | null {
  if (!env?.Errors) return null;

  if (Array.isArray(env.Errors)) return env.Errors[0] ?? null;

  return env.Errors;
}

function asString(v: unknown): string | undefined {

  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/**
 * Client-only component. Mount once (in `__root.tsx`).
 *
 * Returns `null` — it renders nothing. All work happens in a single
 * `useEffect` that owns exactly one interval and one AbortController.
 */
export function IpcErrorBridge(): null {
  // Track { cliInvocationId -> lastSeen MsgId } and { seenErrorMsgIds }
  // across ticks. Refs, not state: no re-renders needed and we do not want
  // React scheduling to change the polling cadence.
  const cursorsRef = useRef<Map<number, string | null>>(new Map());
  const seenRef = useRef<Set<string>>(new Set());
  const tickingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return; // SSR guard
    let isCancelled = false;

    async function tick(): Promise<void> {
      if (tickingRef.current) return; // never overlap ticks
      tickingRef.current = true;
      try {
        // 1) enumerate active invocations
        let sessions: Awaited<ReturnType<typeof getObservabilitySessions>>;
        try {
          sessions = await getObservabilitySessions({
            data: { status: "active", limit: MAX_ACTIVE_INVOCATIONS },
          });
        } catch (e) {
          // BE down / network. Log once per tick, do NOT captureError.
          ClientLogger.warn("[ipcErrorBridge] sessions poll failed", e);

          return;
        }

        const invocations = (sessions.items ?? [])
          .map((s) => {
            const n = Number.parseInt(s.CliInvocationId, 10);

            return Number.isFinite(n) && n > 0 ? { id: n, runId: s.RunId, cli: s.CliName } : null;
          })
          .filter((v): v is { id: number; runId: string | null; cli: string } => v !== null)
          .slice(0, MAX_ACTIVE_INVOCATIONS);

        // Drop cursors for invocations no longer active so memory stays bounded.
        const activeIds = new Set(invocations.map((i) => i.id));
        for (const key of Array.from(cursorsRef.current.keys())) {
          if (activeIds.has(key) === false) cursorsRef.current.delete(key);
        }

        // 2) fan-out mailbox polls
        const results = await Promise.allSettled(
          invocations.map(async (inv) => {
            const afterMsgId = cursorsRef.current.get(inv.id) ?? null;
            const page = await getObservabilitySessionIpc({
              data: {
                cliInvocationId: inv.id,
                mailbox: "main-in",
                limit: 200,
                afterMsgId,
              },
            });

            return { inv, page };
          }),
        );

        if (isCancelled) return;

        for (const r of results) {
          if (r.status !== "fulfilled") {
            ClientLogger.warn("[ipcErrorBridge] ipc poll failed", r.reason);
            continue;
          }

          const { inv, page } = r.value;

          // Advance cursor: prefer NextAfterMsgId, else last item MsgId.
          const nextCursor =
            (page as unknown as { NextAfterMsgId?: string }).NextAfterMsgId ??
            (page.items.length > 0
              ? (asString((page.items[page.items.length - 1] as IpcErrorItem).MsgId) ?? null)
              : null);

          if (nextCursor) cursorsRef.current.set(inv.id, nextCursor);
          else if (cursorsRef.current.has(inv.id) === false) cursorsRef.current.set(inv.id, null);

          // 3) surface Error frames
          for (const raw of page.items) {
            const item = raw as IpcErrorItem;

            if (item.Kind !== "Error") continue;
            const msgId = asString(item.MsgId);

            if (msgId && seenRef.current.has(msgId)) continue;
            const first = firstEnvelopeError(item.Envelope);

            if (!first) continue; // spec requires Envelope.Errors[]; skip malformed

            const code = asString(first.Code) ?? "E_IPC_ERROR";
            const message =
              asString(first.Message) ?? `IPC Error frame from ${inv.cli} (invocation ${inv.id})`;
            const correlationId =
              asString(item.CorrelationId) ?? asString(item.Envelope?.CorrelationId) ?? undefined;

            useErrorStore.getState().captureError(
              { message, code },
              {
                endpoint: `ipc://${inv.cli}/main-in`,
                triggerComponent: "IpcErrorBridge",
                triggerAction: "ipc-error-frame",
                correlationId,
                source: "ipc",
                context: {
                  CliInvocationId: inv.id,
                  RunId: inv.runId,
                  CliName: inv.cli,
                  Mailbox: "main-in",
                  MsgId: msgId,
                  Source: asString(item.Source),
                },
              },
              code,
            );

            if (msgId) seenRef.current.add(msgId);
          }
        }
      } finally {
        tickingRef.current = false;
      }
    }

    // Kick immediately, then on interval.
    void tick();
    const handle = window.setInterval(() => {
      void tick();
    }, POLL_MS);

    return () => {
      isCancelled = true;
      window.clearInterval(handle);
    };
  }, []);

  return null;
}
