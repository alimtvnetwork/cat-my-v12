/**
 * Durable license store + verification audit trail (server-only).
 *
 * The activation flow persists a verified LicenseRecord into
 * `public.license_state` (singleton row) and appends every verification
 * attempt to `public.license_audit`. Reads come from the durable store so
 * activations survive cold starts. An in-memory mirror avoids a round trip
 * on every gate check; it is refreshed after any write.
 *
 * Access is service_role only (see migration). Do not expose these helpers
 * to the browser.
 */
import type { FeatureName, LicenseRecord, LicenseStatus, Tier } from "./license";

let cached: LicenseRecord | null = null;
let isCacheLoaded = false;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  return supabaseAdmin;
}

async function loadFromDb(): Promise<LicenseRecord | null> {
  const db = await admin();
  const { data, error } = await db
    .from("license_state")
    .select("record")
    .eq("id", "singleton")
    .maybeSingle();

  if (error) {
    console.error("[license-store] load failed", error.message);

    return null;
  }

  return (data?.record as LicenseRecord | null) ?? null;
}

export async function getStoredLicense(): Promise<LicenseRecord | null> {
  if (!isCacheLoaded) {
    cached = await loadFromDb();
    isCacheLoaded = true;
  }

  return cached;
}

export interface PersistArgs {
  record: LicenseRecord | null;
  status: LicenseStatus;
  tier: Tier;
  features: FeatureName[];
  reason?: string;
  serverResponseId?: string | null;
  actor?: string | null;
}

export async function persistLicenseState(args: PersistArgs): Promise<void> {
  const db = await admin();
  const { record, status, tier, features, reason, serverResponseId, actor } = args;

  if (record) {
    const { error } = await db.from("license_state").upsert({
      id: "singleton",
      license_id: record.licenseId ?? null,
      tier,
      status,
      serial_number: record.serialNumber ?? null,
      machine_hash: record.machineHash ?? null,
      expires_at: record.expiresAt ?? null,
      features,
      record: record as unknown as never,
      verified_at: new Date().toISOString(),
      server_response_id: serverResponseId ?? null,
    });

    if (error) throw new Error(`license_state upsert failed: ${error.message}`);
    cached = record;
  } else {
    const { error } = await db.from("license_state").upsert({
      id: "singleton",
      license_id: null,
      tier: "TierOne",
      status,
      serial_number: null,
      machine_hash: null,
      expires_at: null,
      features: [],
      record: null,
      verified_at: new Date().toISOString(),
      server_response_id: serverResponseId ?? null,
    });

    if (error) throw new Error(`license_state clear failed: ${error.message}`);
    cached = null;
  }

  isCacheLoaded = true;

  const { error: auditErr } = await db.from("license_audit").insert({
    license_id: record?.licenseId ?? null,
    status,
    tier,
    reason: reason ?? null,
    features,
    server_response_id: serverResponseId ?? null,
    actor: actor ?? null,
  });

  if (auditErr) console.error("[license-store] audit insert failed", auditErr.message);
}

export interface LicenseAuditRow {
  id: string;
  licenseId: string | null;
  status: LicenseStatus;
  tier: Tier;
  reason: string | null;
  features: FeatureName[];
  serverResponseId: string | null;
  actor: string | null;
  verifiedAt: string;
}

export async function listLicenseAudit(limit = 50): Promise<LicenseAuditRow[]> {
  const db = await admin();
  const { data, error } = await db
    .from("license_audit")
    .select(
      "id, license_id, status, tier, reason, features, server_response_id, actor, verified_at",
    )
    .order("verified_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[license-store] audit list failed", error.message);

    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id as string,
    licenseId: (r.license_id as string | null) ?? null,
    status: r.status as LicenseStatus,
    tier: r.tier as Tier,
    reason: (r.reason as string | null) ?? null,
    features: (r.features as FeatureName[]) ?? [],
    serverResponseId: (r.server_response_id as string | null) ?? null,
    actor: (r.actor as string | null) ?? null,
    verifiedAt: r.verified_at as string,
  }));
}
