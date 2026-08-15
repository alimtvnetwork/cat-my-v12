/**
 * Plan 90 Step 114 - Requeue action stub for CLI IPC messages.
 *
 * Root cause guarded (one sentence): the Step 114 UI needs a stable POST
 * target so the "Requeue (dev)" button in `src/routes/cli.ipc.tsx` can be
 * wired, verified in DevTools, and error-surfaced through the standard
 * envelope path today, without pretending the BE handler `POST
 * /api/cli/ipc/{ulid}/requeue` (deferred to a later Plan 90 slice) is
 * already live.
 *
 * Until the BE ships that handler, this route returns a well-formed
 * Universal Envelope with `E_BE_NOT_IMPLEMENTED` so the FE
 * `GlobalErrorModal` renders the operator-facing "not available yet"
 * copy from `spec/03-error-manage/`. That is loud-failure by design:
 * clicking Requeue must never silently succeed.
 *
 * Method contract:
 *  - POST only. GET/PUT/DELETE respond 405 with envelope.
 *  - `$msgId` validated as ULID-ish `[0-9A-HJKMNP-TV-Z]{26}` (Crockford
 *    base32, case-insensitive) or the fallback `[A-Za-z0-9._-]{6,128}`
 *    filename stem used by legacy writers. Empty / oversize -> 400.
 *  - Body is optional JSON `{ mailbox?: string }`; ignored today, will
 *    thread through to the BE handler when it lands.
 *
 * Never swallow: every branch logs `console.error` with `msgId` so the
 * network tab is not the only place a stall is visible.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const MsgIdSchema = z
  .string()
  .min(6, "msgId too short")
  .max(128, "msgId too long")
  .regex(/^[A-Za-z0-9._-]+$/, "msgId must match [A-Za-z0-9._-]+");

function envelope(
  status: number,
  code: string,
  message: string,
  extras: Record<string, unknown> = {},
): Response {
  return new Response(
    JSON.stringify({
      Status: { IsSuccess: false, HttpStatus: status },
      Results: [],
      Errors: [
        {
          Code: code,
          Message: message,
          InternalMsg: `[cli.ipc.requeue] ${code}`,
          Resolution: {
            OperatorAction:
              "This action is scheduled to land in a later Plan 90 slice (BE handler POST /api/cli/ipc/{ulid}/requeue). Until then, requeue manually by moving the .msg.ack.json sidecar back to .msg.json on the host.",
          },
          ...extras,
        },
      ],
    }),
    { status, headers: { "content-type": "application/json" } },
  );
}

export const Route = createFileRoute("/api/cli/ipc/$msgId/requeue")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const parsed = MsgIdSchema.safeParse(params.msgId);

        if (parsed.success === false) {
          console.error("[api.cli.ipc.requeue] rejected malformed msgId", {
            msgId: params.msgId,
            issues: parsed.error.issues,
          });

          return envelope(400, "E_BE_BAD_REQUEST", "Malformed msgId", {
            Details: { MsgId: params.msgId },
          });
        }
        // Consume the body if present so client streams do not stall,
        // but tolerate empty POSTs.
        try {
          const ct = request.headers.get("content-type") ?? "";

          if (ct.includes("application/json")) {
            await request.json().catch(() => null);
          }
        } catch {
          /* body drain is best-effort */
        }

        console.error("[api.cli.ipc.requeue] not-implemented stub hit", { msgId: parsed.data });

        return envelope(
          501,
          "E_BE_NOT_IMPLEMENTED",
          "Requeue is not implemented on this backend build yet.",
          { Details: { MsgId: parsed.data } },
        );
      },
    },
  },
});
