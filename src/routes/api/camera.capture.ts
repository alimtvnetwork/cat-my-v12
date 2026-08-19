/**
 * Plan 90 Step 104 - camera capture proxy, migrated onto the Universal
 * Response Envelope so `beFetch` on the client can route failures by
 * `Errors.Code` (E_CAM_*) instead of HTTP-status pattern matching.
 *
 * The browser POSTs a CaptureRequest here; this route forwards it to the
 * Python worker exposing the vendor SDK (Pylon / Spinnaker / Vimba /
 * Daheng Galaxy) at CAMERA_WORKER_URL. When no worker is configured or
 * the worker is unreachable, respond with an envelope whose Errors.Code
 * is E_CAM_UNAVAILABLE / E_CAM_TIMEOUT / E_CAM_SDK / E_CAM_INVALID so
 * the FE can surface CameraCaptureError with the right `kind`.
 *
 * Worker contract (capture.reference.snapshot):
 *   POST {CAMERA_WORKER_URL}/capture
 *   -> body: { povId?, brightness?, contrast?, exposure?, gain?,
 *              enhance?, saturation? }
 *   -> 200:  { dataUrl: string, width: number, height: number }
 *   -> non-2xx: text or JSON, forwarded into Errors.BackendMessage.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { HttpMethod } from "@/lib/constants";
import { envelopeFail, envelopeOk } from "@/lib/backend/envelope-server";

const CaptureRequestSchema = z.object({
  povId: z.string().max(64).optional(),
  brightness: z.number().finite().optional(),
  contrast: z.number().finite().optional(),
  exposure: z.number().finite().optional(),
  gain: z.number().finite().optional(),
  enhance: z.number().finite().optional(),
  saturation: z.number().finite().optional(),
});

const CaptureResponseSchema = z.object({
  dataUrl: z.string().startsWith("data:image/"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const CORRELATION_HEADER = "X-Correlation-Id";

export const Route = createFileRoute("/api/camera/capture")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const correlationId = request.headers.get(CORRELATION_HEADER);
        const workerUrl = process.env.CAMERA_WORKER_URL;
        const isMissingWorker = !workerUrl;

        if (isMissingWorker) {
          return envelopeFail({
            code: "E_CAM_UNAVAILABLE",
            backendMessage:
              "No camera worker is configured. Set CAMERA_WORKER_URL to the vendor-SDK bridge.",
            httpStatus: 503,
            correlationId,
          });
        }

        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          
          return envelopeFail({
            code: "E_CAM_INVALID",
            backendMessage: "Capture request body was not valid JSON.",
            httpStatus: 400,
            correlationId,
          });
        }

        const parsed = CaptureRequestSchema.safeParse(payload);
        const isFailedParse = parsed.success === false;

        if (isFailedParse) {
          return envelopeFail({
            code: "E_CAM_INVALID",
            backendMessage: "Capture request failed schema validation.",
            httpStatus: 400,
            correlationId,
            details: { Issues: parsed.error.issues },
          });
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        let workerResp: Response;
        try {
          const endpoint = workerUrl.replace(/\/$/, "") + "/capture";
          const headers: Record<string, string> = { "content-type": "application/json" };
          const token = process.env.CAMERA_WORKER_TOKEN;

          if (token) headers.authorization = `Bearer ${token}`;

          if (correlationId) headers[CORRELATION_HEADER] = correlationId;
          workerResp = await fetch(endpoint, {
            method: HttpMethod.Post,
            headers,
            body: JSON.stringify(parsed.data),
            signal: controller.signal,
          });
        } catch (err) {
          const aborted = err instanceof Error && err.name === "AbortError";

          return envelopeFail({
            code: aborted ? "E_CAM_TIMEOUT" : "E_CAM_UNAVAILABLE",
            backendMessage: aborted
              ? "Camera worker did not respond in time."
              : "Could not reach the camera worker.",
            httpStatus: 503,
            correlationId,
          });
        } finally {
          clearTimeout(timeout);
        }

        const isFailed = workerResp.ok === false;

        if (isFailed) {
          const text = (await workerResp.text().catch(() => "")).slice(0, 200);
          const is404 = workerResp.status === 404;

          return envelopeFail({
            code: is404 ? "E_CAM_UNAVAILABLE" : "E_CAM_SDK",
            backendMessage: is404
              ? `Camera worker has no /capture endpoint (HTTP 404). ${text}`
              : `Camera worker returned ${workerResp.status}. ${text}`,
            httpStatus: is404 ? 503 : 502,
            correlationId,
            details: { UpstreamStatus: workerResp.status },
          });
        }

        let body: unknown;
        try {
          body = await workerResp.json();
        } catch {
          
          return envelopeFail({
            code: "E_CAM_SDK",
            backendMessage: "Camera worker returned a non-JSON body.",
            httpStatus: 502,
            correlationId,
          });
        }

        const shot = CaptureResponseSchema.safeParse(body);
        const isFailedShotParse = shot.success === false;

        if (isFailedShotParse) {
          return envelopeFail({
            code: "E_CAM_SDK",
            backendMessage: "Camera worker response did not match the capture contract.",
            httpStatus: 502,
            correlationId,
            details: { Issues: shot.error.issues },
          });
        }

        return envelopeOk(shot.data, { correlationId });
      },
    },
  },
});
