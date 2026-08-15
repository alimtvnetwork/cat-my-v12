/**
 * Server function: `getObservabilitySessionIpc`.
 *
 * Plan 90 Step 77 (FE `IpcMonitor`). Server-side proxy over BE
 * `GET /observability/sessions/{cli_invocation_id}/ipc` (Step 74).
 * Keeps `BE_URL` off the browser bundle and centralises envelope
 * unwrap + wire-code surfacing.
 *
 * Query params mirror Step 74:
 *  - `mailbox`: one of `worker-out|processing-in|processing-out|main-in`.
 *              Omit to let the BE derive from `CliInvocation.CliName`.
 *  - `limit`: 1..500, default 100.
 *  - `includeAcked`: opt-in to `.msg.ack.json` files.
 *  - `afterMsgId`: cursor (ULID-ish); pages forward strictly after it.
 *
 * Response is the unwrapped `Data` payload (PascalCase). `Errors[0]` on
 * the envelope is re-thrown as `"<Code>: <Message>"` so the UI banner
 * surfaces wire codes (`E_BE_NOT_FOUND: mailbox directory missing on
 * disk`, `E_BE_BAD_REQUEST: unknown mailbox`, ...) instead of a plain
 * HTTP status.
 */
import { beFetch } from "@/lib/be-fetch";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MailboxEnum = z.enum(["worker-out", "processing-in", "processing-out", "main-in"]);

const InputSchema = z.object({
  cliInvocationId: z.number().int().positive(),
  mailbox: MailboxEnum.optional(),
  limit: z.number().int().min(1).max(500).optional(),
  includeAcked: z.boolean().optional(),
  afterMsgId: z.string().optional(),
});

const IpcMessageSchema = z
  .object({
    MsgId: z.string(),
    CliInvocationId: z.number().int(),
    RunId: z.string().nullable(),
    Mailbox: z.string(),
    Kind: z.string(),
    Sender: z.string().nullable(),
    Recipient: z.string().nullable(),
    CreatedAt: z.number().nullable(),
    AckedAt: z.number().nullable(),
    RelPath: z.string(),
    AckRelPath: z.string().nullable(),
    PayloadJson: z.string(),
    Bytes: z.number().int(),
    _ParseError: z.string().optional(),
    _Raw: z.string().optional(),
    Seq: z.number().optional(),
    IsAcked: z.boolean().optional(),
    Payload: z.any().optional(),
  })
  .passthrough();

const DataSchema = z
  .object({
    items: z.array(IpcMessageSchema),
    total: z.number().int(),
    limit: z.number().int(),
    mailbox: MailboxEnum.optional(),
    NextAfterMsgId: z.string().nullable().optional(),
    RunId: z.string().nullable().optional(),
    MailboxPath: z.string().optional(),
    IsTruncated: z.boolean().optional(),
    Count: z.number().int().optional(),
  })
  .passthrough();

export type ObservabilityIpcMessage = z.infer<typeof IpcMessageSchema>;
export type IpcItem = ObservabilityIpcMessage;
export type IpcMailbox = z.infer<typeof MailboxEnum>;
export type IpcPage = z.infer<typeof DataSchema>;

function beBaseUrl(): string {
  const url = process.env.BE_URL ?? "http://127.0.0.1:8787";

  return url.replace(/\/$/, "");
}

export const getObservabilitySessionIpc = createServerFn({ method: "GET" })
  .inputValidator((raw) => InputSchema.parse(raw))
  .handler(async ({ data }): Promise<any> => {
    const qs = new URLSearchParams();

    if (data.mailbox) qs.set("mailbox", data.mailbox);

    if (data.limit !== undefined) qs.set("limit", String(data.limit));

    if (data.includeAcked) qs.set("include_acked", "true");

    if (data.afterMsgId) qs.set("after_msg_id", data.afterMsgId);
    const url =
      `${beBaseUrl()}/observability/sessions/${data.cliInvocationId}/ipc` +
      (qs.size ? `?${qs}` : "");
    const env = await beFetch<IpcPage>(url, {}, { suppressCapture: true });
    const payload = env.Results[0];

    if (payload === undefined) {
      throw new Error(
        `BE_ENVELOPE_EMPTY: /observability/sessions/${data.cliInvocationId}/ipc returned no Results`,
      );
    }

    return DataSchema.parse(payload) as any;
  });
