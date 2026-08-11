/**
 * Plan 90 Step 144 - Same-origin proxy for the CLI session export zip.
 *
 * Root cause guarded (one sentence): Step 144 shipped BE
 * `GET /api/cli/sessions/{run_id}/export` (application/zip), but the browser
 * cannot reach the BE origin directly (BE_URL is server-only) and cannot
 * inject an `Authorization` header on a plain <a download> click, so without
 * this same-origin proxy the download surface is unreachable.
 *
 * Streams the upstream zip body straight through without buffering so a
 * 40 MiB triage bundle never sits in Worker memory. Forwards
 * Content-Disposition verbatim so the filename the BE picked
 * (`cli-session-<RunId>.zip`) is what the browser saves. On upstream 404 the
 * envelope JSON is forwarded verbatim (E_BE_NOT_FOUND). Any transport
 * failure returns a Universal Envelope so `beFetch` / GlobalErrorModal
 * render the exact reason instead of a blank download.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const RunIdSchema = z
  .string()
  .min(1, "run_id required")
  .max(128, "run_id too long")
  .regex(/^[A-Za-z0-9._-]+$/, "run_id must match [A-Za-z0-9._-]+");

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

export const Route = createFileRoute("/api/cli/sessions/$runId/export")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const runIdRaw = params.runId;
        const runId = RunIdSchema.safeParse(runIdRaw);
        const isFailedParse = runId.success === false;

        if (isFailedParse) {
          console.error("[cli-export-proxy] rejected run_id", {
            runIdRaw,
            issues: runId.error.issues,
          });

          return jsonError(
            "E_BE_BAD_REQUEST",
            runId.error.issues[0]?.message ?? "bad run_id",
            400,
            { Details: { RunId: runIdRaw } },
          );
        }

        const upstream = `${beBaseUrl()}/api/cli/sessions/${encodeURIComponent(runId.data)}/export`;
        let upstreamResp: Response;
        try {
          upstreamResp = await fetch(upstream, {
            method: "GET",
            headers: { accept: "application/zip" },
            signal: request.signal,
          });
        } catch (err) {
          console.error("[cli-export-proxy] upstream unreachable", {
            runId: runId.data,
            err: err instanceof Error ? err.message : String(err),
          });

          return jsonError("E_BE_UPSTREAM_DOWN", "BE export endpoint unreachable", 503, {
            Details: { RunId: runId.data },
          });
        }

        // Forward envelope-shaped errors (404 not-found, 400 too-large, etc.)
        // verbatim so beFetch on the client sees the canonical envelope.
        if (upstreamResp.status !== 200) {
          const body = await upstreamResp.text().catch(() => "");
          console.error("[cli-export-proxy] upstream non-200", {
            runId: runId.data,
            status: upstreamResp.status,
          });

          return new Response(body, {
            status: upstreamResp.status,
            headers: {
              "content-type": upstreamResp.headers.get("content-type") ?? "application/json",
            },
          });
        }

        const ctype = upstreamResp.headers.get("content-type") ?? "";
        const isNonZip = ctype.startsWith("application/zip") === false;

        if (isNonZip) {
          const preview = (await upstreamResp.text().catch(() => "")).slice(0, 200);
          console.error("[cli-export-proxy] upstream non-zip", {
            runId: runId.data,
            ctype,
          });

          return jsonError(
            "E_BE_UPSTREAM_BAD",
            `upstream returned ${ctype || "unknown"} not zip`,
            502,
            { Details: { RunId: runId.data, BodyPreview: preview } },
          );
        }

        const isMissingBody = !upstreamResp.body;

        if (isMissingBody) {
          return jsonError("E_BE_UPSTREAM_BAD", "upstream zip body missing", 502);
        }

        const disposition =
          upstreamResp.headers.get("content-disposition") ??
          `attachment; filename="cli-session-${runId.data}.zip"`;

        console.info("[cli-export-proxy] streaming", { runId: runId.data });

        return new Response(upstreamResp.body, {
          status: 200,
          headers: {
            "content-type": "application/zip",
            "content-disposition": disposition,
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});