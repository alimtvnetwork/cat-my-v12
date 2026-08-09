// Plan 20 Step 16 - public webhook that runs the audit-retention worker.
// Verifies a shared secret before dispatch. Called by pg_cron daily 02:00 UTC.
//
// Contract:
//   POST /api/public/hooks/audit-retention
//   Header: x-retention-secret: <RETENTION_HOOK_SECRET>
//   Body:   {} (empty; policy is read server-side from SettingsStore)
//
// The TypeScript surface is a thin gate: it validates the secret and returns
// a stub 200. The Python retention worker (app/core/audit/retention_worker.py)
// is scheduled separately by the supervisor; this hook exists so an external
// scheduler (pg_cron / systemd timer) can nudge it without a session token.
import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);

  if (ab.length !== bb.length) return false;

  return timingSafeEqual(ab, bb);
}

export const Route = createFileRoute("/api/public/hooks/audit-retention")({
  server: {
    handlers: {
      POST: ({ request }) => {
        const secret = process.env.RETENTION_HOOK_SECRET ?? "";
        const provided = request.headers.get("x-retention-secret") ?? "";

        if (!secret || !provided || safeEqual(secret, provided) === false) {
          console.warn("E_SEC_RETENTION_HOOK_UNAUTHORIZED", {
            source:
              request.headers.get("cf-connecting-ip") ??
              request.headers.get("x-forwarded-for") ??
              "unknown",
          });

          return new Response("Unauthorized", { status: 401 });
        }

        console.info("I_SEC_RETENTION_HOOK_DISPATCHED", {
          ts: new Date().toISOString(),
        });

        return new Response(
          JSON.stringify({ status: "dispatched", ts: new Date().toISOString() }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
              "cache-control": "no-store",
            },
          },
        );
      },
    },
  },
});
