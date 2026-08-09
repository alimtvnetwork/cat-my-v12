import { createFileRoute } from "@tanstack/react-router";

// Spec 42 §7 + Q-10: liveness probe, unauthenticated, Ok-only body.
// Never returns diagnostic data - reserved for /health/ready.
export const Route = createFileRoute("/api/public/health/live")({
  server: {
    handlers: {
      GET: () =>
        new Response("Ok", {
          status: 200,
          headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
        }),
    },
  },
});
