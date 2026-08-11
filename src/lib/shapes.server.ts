/**
 * Plan 64 step 68 server-only helpers for Shape assets.
 * Kept in a `.server.ts` file so `supabaseAdmin` and the SVG normaliser
 * never leak into the client bundle.
 */
import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface CompiledShape {
  id: string;
  name: string;
  svgPath: string;
  viewBoxW: number;
  viewBoxH: number;
  sha256: string;
  createdAt: string;
}

/** Locked to absolute commands with 3-decimal precision per spec 36. */
const ABSOLUTE_CMD = /^[MLHVCSQTAZ0-9.\-,\s]+$/i;

export function normaliseSvgPath(input: string): string {
  const trimmed = input.trim();

  if (ABSOLUTE_CMD.test(trimmed) === false) {
    throw new Error(
      "shapes.normaliseSvgPath: only absolute SVG path commands are accepted (M L H V C S Q T A Z).",
    );
  }

  // Collapse whitespace and clamp decimals to 3 places without changing semantics.
  return trimmed
    .replace(/\s+/g, " ")
    .replace(/(-?\d*\.\d+)/g, (m) => Number.parseFloat(m).toFixed(3));
}

export function shapeSha256(payload: {
  name: string;
  svgPath: string;
  viewBoxW: number;
  viewBoxH: number;
}): string {
  const canonical = JSON.stringify({
    n: payload.name,
    p: payload.svgPath,
    w: payload.viewBoxW,
    h: payload.viewBoxH,
  });

  return createHash("sha256").update(canonical).digest("hex");
}

export async function insertShape(payload: {
  supabase: SupabaseClient;
  ownerId: string;
  name: string;
  svgPath: string;
  viewBoxW: number;
  viewBoxH: number;
}): Promise<CompiledShape> {
  const sha256 = shapeSha256(payload);
  const viewBox = `0 0 ${payload.viewBoxW} ${payload.viewBoxH}`;
  const svg = renderStandaloneSvg({
    svgPath: payload.svgPath,
    viewBoxW: payload.viewBoxW,
    viewBoxH: payload.viewBoxH,
  });

  // Dedup by (owner_id, sha256): if the same shape was already compiled,
  // return the existing row instead of erroring on the UNIQUE constraint.
  const existing = await payload.supabase
    .from("shape_assets")
    .select("id, name, svg, view_box, sha256, created_at")
    .eq("owner_id", payload.ownerId)
    .eq("sha256", sha256)
    .maybeSingle();

  if (existing.error) throw existing.error;

  if (existing.data) {
    return {
      id: existing.data.id,
      name: existing.data.name,
      svgPath: payload.svgPath,
      viewBoxW: payload.viewBoxW,
      viewBoxH: payload.viewBoxH,
      sha256: existing.data.sha256,
      createdAt: existing.data.created_at,
    };
  }

  const inserted = await payload.supabase
    .from("shape_assets")
    .insert({
      owner_id: payload.ownerId,
      name: payload.name,
      sha256,
      svg,
      view_box: viewBox,
    })
    .select("id, name, sha256, created_at")
    .single();

  if (inserted.error) throw inserted.error;

  return {
    id: inserted.data.id,
    name: inserted.data.name,
    svgPath: payload.svgPath,
    viewBoxW: payload.viewBoxW,
    viewBoxH: payload.viewBoxH,
    sha256: inserted.data.sha256,
    createdAt: inserted.data.created_at,
  };
}

export function renderStandaloneSvg(input: {
  svgPath: string;
  viewBoxW: number;
  viewBoxH: number;
}): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${input.viewBoxW} ${input.viewBoxH}"><path d="${input.svgPath}" fill="currentColor"/></svg>`;
}