import { TOOL_TOOLTIPS, type ToolId } from "./toolTooltipMap";
import { logger } from "@/lib/editor/errors";

export const VARIANT_STORAGE_KEY = "v4.tools.variants";

export type VariantMap = Partial<Record<ToolId, string>>;

export function readStoredVariants(): VariantMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(VARIANT_STORAGE_KEY);

    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== "object") return {};

    return parsed as VariantMap;
  } catch (err) {
    logger.warn("W_UI_TOOL_VARIANT_READ_FAILED", { err: String(err) });

    return {};
  }
}

export function writeStoredVariants(map: VariantMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VARIANT_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    logger.warn("W_UI_TOOL_VARIANT_WRITE_FAILED", { err: String(err) });
  }
}

export function defaultVariantId(id: ToolId): string | undefined {
  return TOOL_TOOLTIPS[id].variants?.[0]?.id;
}
