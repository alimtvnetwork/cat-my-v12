import { OpsEventCodeType } from "@/lib/ops.shared";
import { FeatureNameType } from "@/lib/license";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { appendOpsEvent } from "./ops.server";
import { requireCaptureAdmin } from "./capture-auth.server";
import { requireServerFeature } from "./license-gate.server";
import {
  deviceRefText,
  readCurrentVendor,
  readDiscoverySnapshot,
  writeCurrentVendor,
  selectDeviceWithAudit,
} from "./capture.server";
import {
  SUPPORTED_VENDORS,
  newCorrelationId,
  parseDeviceSelection,
  parseVendorRequest,
  toCaptureError,
  type CaptureVendor,
} from "./capture.shared";
import { HttpMethod } from "@/lib/constants";

/**
 * Capture vendor server-fn bridge (closes v1.37 L1').
 *
 * All handlers funnel thrown errors through toCaptureError() so callers see
 * the locked E_* envelope from spec/21-app/67-v2-discovery-contract.md (Plan 15
 * Step 10). Every failure is logged with structured context (including a
 * correlation ID that also travels back in the error message as
 * `[cid=xxxx]`) before it crosses the RPC boundary; the UI parses both the
 * leading code prefix and the cid so an operator can grep /ops for the
 * matching audit row.
 */

export { SUPPORTED_VENDORS, type CaptureVendor };

async function guard<T>(subject: string, run: (cid: string) => Promise<T>): Promise<T> {
  const cid = newCorrelationId();
  console.info(`[capture.fn] subject=${subject} cid=${cid} phase=start`);
  try {
    const out = await run(cid);
    console.info(`[capture.fn] subject=${subject} cid=${cid} phase=ok`);

    return out;
  } catch (err) {
    const ce = toCaptureError(err, cid);
    console.warn(
      `[capture.fn] subject=${subject} cid=${cid} code=${ce.code} message=${ce.message}`,
    );

    if (
      ce.code === OpsEventCodeType.E_CFG_UNKNOWN_DEVICE &&
      subject === "settings.capture.device"
    ) {
      try {
        appendOpsEvent({
          code: OpsEventCodeType.E_CFG_UNKNOWN_DEVICE,
          subject,
          detail: ce.message,
          correlationId: cid,
        });
      } catch (auditErr) {
        console.error(`[capture.fn] subject=${subject} cid=${cid} ops-audit-emit-failed`, auditErr);
      }
    }

    throw ce;
  }
}

export const getCaptureVendor = createServerFn({ method: HttpMethod.Get }).handler(async () => {
  return guard("settings.capture.vendor.read", async () => readCurrentVendor());
});

export const setCaptureVendor = createServerFn({ method: HttpMethod.Post })
  .middleware([requireSupabaseAuth])
  .validator(parseVendorRequest)
  .handler(async ({ data, context }) => {
    return guard("settings.capture.vendor.write", async (cid) => {
      const actor = await requireCaptureAdmin(context.userId, "settings.capture.vendor");
      const prev = readCurrentVendor().vendor;
      const vendor = writeCurrentVendor(data.vendor);
      appendOpsEvent({
        code: OpsEventCodeType.I_SEC_ADMIN_WRITE,
        subject: "settings.capture.vendor",
        actor,
        prior: prev,
        next: vendor,
        correlationId: cid,
        detail: `actor=${actor} prior=${prev} next=${vendor} cid=${cid}`,
      });

      return { ok: true as const, vendor, correlationId: cid };
    });
  });

export const getDiscoveredDevices = createServerFn({ method: HttpMethod.Get })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return guard("settings.capture.discovery", async (cid) => {
      await requireCaptureAdmin(context.userId, "settings.capture.discovery");
      const snap = readDiscoverySnapshot();

      return { ...snap, correlationId: cid };
    });
  });

export const selectCaptureDevice = createServerFn({ method: HttpMethod.Post })
  .middleware([requireSupabaseAuth])
  .validator(parseDeviceSelection)
  .handler(async ({ data, context }) => {
    return guard("settings.capture.device", async (cid) => {
      const actor = await requireCaptureAdmin(context.userId, "settings.capture.device");
      await requireServerFeature(FeatureNameType.MultiVendorCameraSelection);
      const result = await selectDeviceWithAudit(
        data.vendor,
        data.serial,
        actor,
        ({ prior, next }) => {
          return appendOpsEvent({
            code: OpsEventCodeType.I_SEC_ADMIN_WRITE,
            subject: "settings.capture.device",
            actor,
            prior: deviceRefText(prior),
            next: deviceRefText(next),
            correlationId: cid,
            detail: `actor=${actor} prior=${deviceRefText(prior)} next=${deviceRefText(next)} cid=${cid}`,
          });
        },
      );
      const snapshot = readDiscoverySnapshot();

      return {
        ...snapshot,
        ok: true as const,
        subject: "settings.capture.device" as const,
        prior: result.prior,
        next: result.next,
        audit_id: String(result.audit.id),
        ts: result.audit.ts,
        vendor: result.device.vendor,
        correlationId: cid,
      };
    });
  });
