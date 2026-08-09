/**
 * Plan 90 Step 73 - Same-origin SSE proxy for the disk-backed CLI log tail.
 *
 * Root cause guarded (one sentence): Step 72 shipped the BE SSE endpoint
 * `GET /api/cli/sessions/{run_id}/log` but no browser client could reach it,
 * because (a) EventSource is same-origin and (b) `BE_URL` must never ship to
 * the browser bundle — so the SSE route was unreachable and functionally
 * dead code.
 *
 * This route proxies the SSE byte stream through the FE origin, forwarding
 * `follow`, `since_line`, and `max_lines` query params verbatim. It streams
 * the response body without buffering so `data:` frames and `id:` cursors
 * reach the browser as the writer emits them.
 *
 * Error surface (loud-failure, no swallowing):
 *  - Invalid `run_id` (empty / too long) -> 400 JSON `{Code:"E_BE_BAD_REQUEST"}`.
 *  - Upstream 404 -> 404 JSON body forwarded verbatim (the BE returns the
 *    envelope with `E_BE_NOT_FOUND` + `Details.RunId`).
 *  - Upstream unreachable / abort -> 503 JSON `{Code:"E_BE_UPSTREAM_DOWN"}`.
 *  - Non-2xx / non-SSE content-type -> 502 JSON with upstream status.
 * Every failure branch logs to `console.error` with the run_id so the
 * network tab is never the only place a stall is visible.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const RunIdSchema = z
  .string()
  .min(1, "run_id required")
  .max(128, "run_id too long")
  .regex(/^[A-Za-z0-9._-]+$/, "run_id must match [A-Za-z0-9._-]+");

const QuerySchema = z.object({
  follow: z.enum(["true", "false"]).optional(),
  since_line: z.coerce.number().int().min(0).optional(),
  max_lines: z.coerce.number().int().min(1).max(5000).optional(),
});

function jsonError(
  code: string,
  message: string,
  status: number,
  extras: Record<string, unknown> = {},
): Response {
  return new Response(
    JSON.stringify({
      Status: { IsSuccess: false, HttpStatus: status },
      Data: null,
      Errors: [{ Code: code, Message: message, ...extras }],
    }),
    { status, headers: { "content-type": "application/json" } },
  );
}

function beBaseUrl(): string {
  const url = process.env.BE_URL ?? "http://127.0.0.1:8787";

  return url.replace(/\/$/, "");
}

export const Route = createFileRoute("/api/cli/sessions/$runId/log")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const runIdRaw = params.runId;
        const runId = RunIdSchema.safeParse(runIdRaw);
        const isFailedParse = runId.success === false;

        if (isFailedParse) {
          console.error("[cli-log-proxy] rejected run_id", {
            runIdRaw,
            issues: runId.error.issues,
          });

          return jsonError(
            "E_BE_BAD_REQUEST",
            runId.error.issues[0]?.message ?? "bad run_id",
            400,
            {
              Details: { RunId: runIdRaw },
            },
          );
        }

        const url = new URL(request.url);
        const qs = QuerySchema.safeParse({
          follow: url.searchParams.get("follow") ?? undefined,
          since_line: url.searchParams.get("since_line") ?? undefined,
          max_lines: url.searchParams.get("max_lines") ?? undefined,
        });
        const isFailedParseQs = qs.success === false;

        if (isFailedParseQs) {
          console.error("[cli-log-proxy] rejected query", {
            runId: runId.data,
            issues: qs.error.issues,
          });

          return jsonError("E_BE_BAD_REQUEST", qs.error.issues[0]?.message ?? "bad query", 400);
        }

        const upstream = new URL(
          `${beBaseUrl()}/api/cli/sessions/${encodeURIComponent(runId.data)}/log`,
        );

        if (qs.data.follow) upstream.searchParams.set("follow", qs.data.follow);

        if (qs.data.since_line !== undefined)
          upstream.searchParams.set("since_line", String(qs.data.since_line));

        if (qs.data.max_lines !== undefined)
          upstream.searchParams.set("max_lines", String(qs.data.max_lines));

        let upstreamResp: Response;
        try {
          upstreamResp = await fetch(upstream.toString(), {
            method: "GET",
            headers: { accept: "text/event-stream" },
            signal: request.signal,
          });
        } catch (err) {
          console.error("[cli-log-proxy] upstream unreachable", {
            runId: runId.data,
            err: err instanceof Error ? err.message : String(err),
          });

          return jsonError("E_BE_UPSTREAM_DOWN", "BE SSE endpoint unreachable", 503, {
            Details: { RunId: runId.data, Upstream: upstream.pathname },
          });
        }

        if (upstreamResp.status === 404) {
          const body = await upstreamResp.text().catch(() => "");
          console.error("[cli-log-proxy] upstream 404", { runId: runId.data });

          return new Response(body, {
            status: 404,
            headers: {
              "content-type": upstreamResp.headers.get("content-type") ?? "application/json",
            },
          });
        }

        const ctype = upstreamResp.headers.get("content-type") ?? "";
        const isFailed = upstreamResp.ok === false;
        const isNonSse = ctype.startsWith("text/event-stream") === false;

        if (isFailed || isNonSse) {
          const preview = (await upstreamResp.text().catch(() => "")).slice(0, 200);
          console.error("[cli-log-proxy] upstream non-SSE", {
            runId: runId.data,
            status: upstreamResp.status,
            ctype,
          });

          return jsonError("E_BE_UPSTREAM_BAD", `upstream returned ${upstreamResp.status}`, 502, {
            Details: { RunId: runId.data, Upstream: upstream.pathname, BodyPreview: preview },
          });
        }

        const isMissingBody = !upstreamResp.body;

        if (isMissingBody) {
          console.error("[cli-log-proxy] upstream missing body", { runId: runId.data });

          return jsonError("E_BE_UPSTREAM_BAD", "upstream SSE body missing", 502);
        }

        console.info("[cli-log-proxy] streaming", {
          runId: runId.data,
          follow: qs.data.follow ?? "false",
          sinceLine: qs.data.since_line ?? 0,
        });

        return new Response(upstreamResp.body, {
          status: 200,
          headers: {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-cache, no-transform",
            "x-accel-buffering": "no",
            connection: "keep-alive",
          },
        });
      },
    },
  },
});
