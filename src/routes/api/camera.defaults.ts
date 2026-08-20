/**
 * Plan 90 Step 104 - camera defaults proxy, on the Universal Envelope.
 *
 * Returns the vendor worker's current default values for POV and the
 * tunable controls. Always resolves 200 with a Universal Envelope whose
 * `Results[0]` carries `{source, reason?, defaults}` so the browser can
 * render a "Reset camera controls" action that never depends on the
 * worker being reachable. `source: "fallback"` when the UI's built-in
 * defaults are used; `source: "worker"` when the worker responded.
 *
 * Worker contract (capture.reference.defaults):
 *   GET {CAMERA_WORKER_URL}/defaults
 *   -> 200: { povId?, brightness?, contrast?, exposure?, gain?,
 *             enhance?, saturation? }
 *   -> any other status / no worker: fall back to built-in defaults
 *      with `reason` set to a stable machine token.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { HttpMethod } from "@/lib/constants";
import { envelopeOk } from "@/lib/backend/envelope-server";

const CORRELATION_HEADER = "X-Correlation-Id";

const DefaultsSchema = z.object({
  povId: z.string().max(64).optional(),
  brightness: z.number().finite().optional(),
  contrast: z.number().finite().optional(),
  exposure: z.number().finite().optional(),
  gain: z.number().finite().optional(),
  enhance: z.number().finite().optional(),
  saturation: z.number().finite().optional(),
});

// Hardcoded fallback used when the worker is not configured, does not
// respond, or returns an unparseable body. Mirrors
// DEFAULT_CAMERA_CONTROLS in src/components/hmi/CameraPreview.tsx.
const FALLBACK_DEFAULTS = {
  povId: "top-down",
  brightness: 1.0,
  contrast: 1.0,
  exposure: 0,
  gain: 0,
  enhance: 0,
  saturation: 100,
} as const;

interface DefaultsPayload {
  source: "worker" | "fallback";
  reason?: string;
  defaults: Record<string, unknown>;
}

export const Route = createFileRoute("/api/camera/defaults")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const correlationId = request.headers.get(CORRELATION_HEADER);
        const emit = (payload: DefaultsPayload): Response =>
          envelopeOk<DefaultsPayload>(payload, { correlationId });

        const workerUrl = process.env.CAMERA_WORKER_URL;
        const isMissingWorker = !workerUrl;

        if (isMissingWorker) {
          return emit({
            source: "fallback",
            reason: "worker-not-configured",
            defaults: { ...FALLBACK_DEFAULTS },
          });
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        let workerResp: Response;
        try {
          const endpoint = workerUrl.replace(/\/$/, "") + "/defaults";
          const headers: Record<string, string> = { accept: "application/json" };
          const token = process.env.CAMERA_WORKER_TOKEN;

          if (token) headers.authorization = `Bearer ${token}`;

          if (correlationId) headers[CORRELATION_HEADER] = correlationId;
          workerResp = await fetch(endpoint, {
            method: HttpMethod.Get,
            headers,
            signal: controller.signal,
          });
        } catch (err) {
          clearTimeout(timeout);

          return emit({
            source: "fallback",
            reason:
              err instanceof Error && err.name === "AbortError"
                ? "worker-timeout"
                : "worker-unreachable",
            defaults: { ...FALLBACK_DEFAULTS },
          });
        }

        clearTimeout(timeout);

        const isFailed = workerResp.ok === false;

        if (isFailed) {
          return emit({
            source: "fallback",
            reason: `worker-status-${workerResp.status}`,
            defaults: { ...FALLBACK_DEFAULTS },
          });
        }

        let body: unknown;
        try {
          body = await workerResp.json();
        } catch {
          return emit({
            source: "fallback",
            reason: "worker-bad-json",
            defaults: { ...FALLBACK_DEFAULTS },
          });
        }

        const parsed = DefaultsSchema.safeParse(body);
        const isFailedParse = parsed.success === false;

        if (isFailedParse) {
          return emit({
            source: "fallback",
            reason: "worker-bad-shape",
            defaults: { ...FALLBACK_DEFAULTS },
          });
        }

        // Merge worker defaults over the fallback so any missing field
        // still has a sane value. Explicit worker fields win.
        return emit({
          source: "worker",
          defaults: { ...FALLBACK_DEFAULTS, ...parsed.data },
        });
      },
    },
  },
});
