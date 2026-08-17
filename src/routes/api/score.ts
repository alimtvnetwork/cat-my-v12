import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { HttpMethod } from "@/lib/constants";
import { envelopeFail, envelopeOk } from "@/lib/backend/envelope-server";

const RuleInputSchema = z.object({
  id: z.string(),
  kind: z.string(),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  params: z.record(z.unknown()).optional(),
});

const ScoreRequestSchema = z.object({
  imageDataUrl: z.string(),
  imageName: z.string(),
  imageWidth: z.number().int(),
  imageHeight: z.number().int(),
  rules: z.array(RuleInputSchema),
});

const CORRELATION_HEADER = "X-Correlation-Id";

export const Route = createFileRoute("/api/score")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const correlationId = request.headers.get(CORRELATION_HEADER);
        const workerUrl = process.env.VALIDATION_WORKER_URL;
        const isMissingWorker = !workerUrl;

        if (isMissingWorker) {
          return envelopeFail({
            code: "E_SCORE_UNAVAILABLE",
            backendMessage:
              "No validation worker is configured. Set VALIDATION_WORKER_URL to the remote scorer.",
            httpStatus: 503,
            correlationId,
          });
        }

        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return envelopeFail({
            code: "E_SCORE_INVALID",
            backendMessage: "Score request body was not valid JSON.",
            httpStatus: 400,
            correlationId,
          });
        }

        const parsed = ScoreRequestSchema.safeParse(payload);
        const isFailedParse = parsed.success === false;

        if (isFailedParse) {
          return envelopeFail({
            code: "E_SCORE_INVALID",
            backendMessage: "Score request failed schema validation.",
            httpStatus: 400,
            correlationId,
            details: { Issues: parsed.error.issues },
          });
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        let workerResp: Response;
        try {
          const endpoint = workerUrl.replace(/\/$/, "") + "/score";
          const headers: Record<string, string> = { "content-type": "application/json" };
          const token = process.env.VALIDATION_WORKER_TOKEN;

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
            code: aborted ? "E_SCORE_TIMEOUT" : "E_SCORE_UNAVAILABLE",
            backendMessage: aborted
              ? "Validation worker did not respond in time."
              : "Could not reach the validation worker.",
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
            code: is404 ? "E_SCORE_UNAVAILABLE" : "E_SCORE_SDK",
            backendMessage: is404
              ? `Validation worker has no /score endpoint (HTTP 404). ${text}`
              : `Validation worker returned ${workerResp.status}. ${text}`,
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
            code: "E_SCORE_SDK",
            backendMessage: "Validation worker returned a non-JSON body.",
            httpStatus: 502,
            correlationId,
          });
        }

        return envelopeOk(body, { correlationId });
      },
    },
  },
});
