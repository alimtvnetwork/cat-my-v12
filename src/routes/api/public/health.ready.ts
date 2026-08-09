import { createFileRoute } from "@tanstack/react-router";
import { recordDenial, verifyToken } from "@/lib/security/health-token";

// Spec 42 §7 + Q-10: readiness probe with tiered auth.
// - Bearer token from env HEALTH_TOKEN (mirrors 27.Obs.HealthToken).
// - HEALTH_TOKEN_PREV accepted for a 300s rotation grace (HEALTH_TOKEN_PREV_EXPIRES_AT).
// - Timing-safe compare via `verifyToken` (F-46).
// - Every denial routes through `recordDenial` (F-49) and emits a structured
//   audit line `I_HEALTH_READY_AUDIT` (F-48). Threshold breach raises
//   `E_SEC_HEALTH_BRUTE_FORCE`.

const GRACE_WINDOW_SECONDS = 300;

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

interface AuthResult {
  ok: boolean;
  usedPrev: boolean;
}

function checkBearer(header: string | null): AuthResult {
  const isMissingHeader = !header;

  if (isMissingHeader) return { ok: false, usedPrev: false };
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const isMissingMatch = !match;

  if (isMissingMatch) return { ok: false, usedPrev: false };
  const provided = match[1];
  const current = process.env.HEALTH_TOKEN ?? "";

  if (current && verifyToken(current, provided)) return { ok: true, usedPrev: false };
  const prev = process.env.HEALTH_TOKEN_PREV ?? "";
  const prevExpires = Number(process.env.HEALTH_TOKEN_PREV_EXPIRES_AT ?? "0");
  const withinGrace = prevExpires > 0 && nowSeconds() <= prevExpires + GRACE_WINDOW_SECONDS;

  if (prev && withinGrace && verifyToken(prev, provided)) return { ok: true, usedPrev: true };
  const isExpired = !withinGrace;

  if (prev && prevExpires > 0 && isExpired) {
    console.warn("I_HEALTH_TOKEN_GRACE_EXPIRED", { prevExpires, now: nowSeconds() });
  }

  return { ok: false, usedPrev: false };
}

function sourceKey(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown"
  );
}

function auditLine(
  outcome: "allow" | "deny",
  request: Request,
  extras: Record<string, unknown>,
): void {
  console.info("I_HEALTH_READY_AUDIT", {
    outcome,
    path: "/api/public/health/ready",
    source: sourceKey(request),
    ts: new Date().toISOString(),
    ...extras,
  });
}

export const Route = createFileRoute("/api/public/health/ready")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const auth = checkBearer(request.headers.get("authorization"));

        if (auth.ok) {
          auditLine("allow", request, { rotated: auth.usedPrev });

          if (auth.usedPrev) console.info("I_HEALTH_TOKEN_ROTATED", { acceptedPrev: true });
          const body = { status: "ready", ts: new Date().toISOString(), rotated: auth.usedPrev };

          return new Response(JSON.stringify(body), {
            status: 200,
            headers: { "content-type": "application/json", "cache-control": "no-store" },
          });
        }

        const brute = recordDenial(sourceKey(request));
        auditLine("deny", request, { brute });

        if (brute) console.error("E_SEC_HEALTH_BRUTE_FORCE", { source: sourceKey(request) });

        return new Response("Unauthorized", {
          status: 401,
          headers: { "www-authenticate": 'Bearer realm="health"', "cache-control": "no-store" },
        });
      },
    },
  },
});
