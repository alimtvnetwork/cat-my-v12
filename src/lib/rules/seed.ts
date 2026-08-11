// Auto-seed the shared rules library so operators see a populated
// /setup/rules view on first launch. Idempotent: honours a localStorage
// flag AND checks whether the facade already has non-builtin entries.
import { makeRuleFacade } from "./facade";
import type { RuleFacade } from "./facade";
import type { Rule, RuleId } from "./model";
import { UNCATEGORIZED_RULE_ID } from "./model";

const FLAG = "ca:rules-autoseeded:v1";
let inFlight: Promise<number | null> | null = null;

function nowIso(): string {
  return new Date().toISOString();
}

function id(prefix: "cat" | "rule", slug: string): RuleId {
  return `${prefix}-${slug}` as RuleId;
}

function makeSeedRows(): Rule[] {
  const t = nowIso();
  const catLabel = id("cat", "label");
  const catCap = id("cat", "cap");
  const catFill = id("cat", "fill");
  const catComp = id("cat", "components");
  const catText = id("cat", "text");
  const catSolder = id("cat", "solder");

  // Plan 100 Phase G step 63: canonical V4 taxonomy categories. These
  // sit alongside the domain-specific categories above so operators see
  // both the "why" (Label, Cap, Solder…) and the "how" (Presence,
  // Color, OCR…) taxonomies on first launch. Step 64 attaches one rule
  // to each generic taxonomy so every category is non-empty.
  const catPresence = id("cat", "presence");
  const catAbsence = id("cat", "absence");
  const catColor = id("cat", "color");
  const catOcr = id("cat", "ocr");
  const catGeometry = id("cat", "geometry");
  const catMath = id("cat", "math");

  const cats: Rule[] = [
    {
      id: UNCATEGORIZED_RULE_ID,
      name: "Uncategorized",
      isCategory: true,
      appliesBefore: [],
      conditions: [],
      createdAt: t,
      updatedAt: t,
    },
    {
      id: catLabel,
      name: "Label",
      isCategory: true,
      appliesBefore: [],
      conditions: [],
      createdAt: t,
      updatedAt: t,
      notes: "Bottle line front-label checks",
    },
    {
      id: catCap,
      name: "Cap",
      isCategory: true,
      appliesBefore: [catLabel],
      conditions: [],
      createdAt: t,
      updatedAt: t,
      notes: "Cap presence and torque marks",
    },
    {
      id: catFill,
      name: "Fill Level",
      isCategory: true,
      appliesBefore: [catCap],
      conditions: [],
      createdAt: t,
      updatedAt: t,
    },
    {
      id: catComp,
      name: "Components",
      isCategory: true,
      appliesBefore: [],
      conditions: [],
      createdAt: t,
      updatedAt: t,
      notes: "PCB placement checks",
    },
    {
      id: catText,
      name: "Text / OCR",
      isCategory: true,
      appliesBefore: [catComp],
      conditions: [],
      createdAt: t,
      updatedAt: t,
    },
    {
      id: catSolder,
      name: "Solder",
      isCategory: true,
      appliesBefore: [catComp],
      conditions: [],
      createdAt: t,
      updatedAt: t,
    },
    {
      id: catPresence,
      name: "Presence",
      isCategory: true,
      appliesBefore: [],
      conditions: [],
      createdAt: t,
      updatedAt: t,
      notes: "Feature must exist inside ROI",
    },
    {
      id: catAbsence,
      name: "Absence",
      isCategory: true,
      appliesBefore: [catPresence],
      conditions: [],
      createdAt: t,
      updatedAt: t,
      notes: "ROI must be empty / no feature",
    },
    {
      id: catColor,
      name: "Color",
      isCategory: true,
      appliesBefore: [],
      conditions: [],
      createdAt: t,
      updatedAt: t,
      notes: "Hue / saturation / delta-E gates",
    },
    {
      id: catOcr,
      name: "OCR",
      isCategory: true,
      appliesBefore: [],
      conditions: [],
      createdAt: t,
      updatedAt: t,
      notes: "Text extraction + regex match",
    },
    {
      id: catGeometry,
      name: "Geometry",
      isCategory: true,
      appliesBefore: [],
      conditions: [],
      createdAt: t,
      updatedAt: t,
      notes: "Edge, angle, distance, pocket count",
    },
    {
      id: catMath,
      name: "Math",
      isCategory: true,
      appliesBefore: [catGeometry],
      conditions: [],
      createdAt: t,
      updatedAt: t,
      notes: "Derived expressions over other rules",
    },
  ];

  const rules: Rule[] = [
    {
      id: id("rule", "label-presence"),
      name: "Front Label Presence",
      isCategory: false,
      categoryId: catLabel,
      appliesBefore: [],
      conditions: [],
      pocketSize: 2,
      createdAt: t,
      updatedAt: t,
      notes: "Verify label ROI has expected pattern match score",
    },
    {
      id: id("rule", "logo-match"),
      name: "Logo Pattern Match",
      isCategory: false,
      categoryId: catLabel,
      appliesBefore: [id("rule", "label-presence")],
      conditions: [],
      pocketSize: 1,
      createdAt: t,
      updatedAt: t,
    },
    {
      id: id("rule", "cap-color"),
      name: "Cap Colour Sample",
      isCategory: false,
      categoryId: catCap,
      appliesBefore: [],
      conditions: [],
      pocketSize: 3,
      createdAt: t,
      updatedAt: t,
    },
    {
      id: id("rule", "torque-mark"),
      name: "Torque Indicator Angle",
      isCategory: false,
      categoryId: catCap,
      appliesBefore: [id("rule", "cap-color")],
      conditions: [],
      pocketSize: 2,
      createdAt: t,
      updatedAt: t,
    },
    {
      id: id("rule", "fill-height"),
      name: "Meniscus Fill Height",
      isCategory: false,
      categoryId: catFill,
      appliesBefore: [],
      conditions: [],
      pocketSize: 4,
      createdAt: t,
      updatedAt: t,
    },
    {
      id: id("rule", "ic-placement"),
      name: "IC Placement",
      isCategory: false,
      categoryId: catComp,
      appliesBefore: [],
      conditions: [],
      pocketSize: 2,
      createdAt: t,
      updatedAt: t,
    },
    {
      id: id("rule", "pin1-marker"),
      name: "Pin 1 Marker",
      isCategory: false,
      categoryId: catComp,
      appliesBefore: [id("rule", "ic-placement")],
      conditions: [],
      pocketSize: 1,
      createdAt: t,
      updatedAt: t,
    },
    {
      id: id("rule", "silkscreen-ocr"),
      name: "Silkscreen OCR",
      isCategory: false,
      categoryId: catText,
      appliesBefore: [],
      conditions: [],
      pocketSize: 3,
      createdAt: t,
      updatedAt: t,
    },
    {
      id: id("rule", "solder-bridge"),
      name: "Solder Bridge Blob",
      isCategory: false,
      categoryId: catSolder,
      appliesBefore: [],
      conditions: [],
      pocketSize: 4,
      createdAt: t,
      updatedAt: t,
    },
    // Plan 100 Phase G step 64: one rule per generic taxonomy so every
    // category is populated on first launch. 2 ROI rules (Presence +
    // Geometry), 1 OCR, 1 Color, 1 Absence, 1 Math.
    {
      id: id("rule", "pill-presence"),
      name: "Pill Pocket Presence",
      isCategory: false,
      categoryId: catPresence,
      appliesBefore: [],
      conditions: [],
      pocketSize: 4,
      createdAt: t,
      updatedAt: t,
      notes: "ROI must contain a pill (edge density > 0.35)",
    },
    {
      id: id("rule", "empty-pocket"),
      name: "Empty Pocket Check",
      isCategory: false,
      categoryId: catAbsence,
      appliesBefore: [id("rule", "pill-presence")],
      conditions: [],
      pocketSize: 4,
      createdAt: t,
      updatedAt: t,
      notes: "Rejects pockets where absence is required",
    },
    {
      id: id("rule", "cap-color-delta"),
      name: "Cap Color ΔE",
      isCategory: false,
      categoryId: catColor,
      appliesBefore: [],
      conditions: [],
      pocketSize: 2,
      createdAt: t,
      updatedAt: t,
      notes: "Reject if ΔE from reference swatch > 6",
    },
    {
      id: id("rule", "lot-code-ocr"),
      name: "Lot-Code OCR",
      isCategory: false,
      categoryId: catOcr,
      appliesBefore: [],
      conditions: [],
      pocketSize: 1,
      createdAt: t,
      updatedAt: t,
      notes: "Regex ^[A-Z]{2}\\d{6}$",
    },
    {
      id: id("rule", "pocket-count"),
      name: "Pocket Count / Row",
      isCategory: false,
      categoryId: catGeometry,
      appliesBefore: [],
      conditions: [],
      pocketSize: 8,
      createdAt: t,
      updatedAt: t,
      notes: "Count blob centroids per row",
    },
    {
      id: id("rule", "yield-ratio"),
      name: "Row Yield Ratio",
      isCategory: false,
      categoryId: catMath,
      appliesBefore: [id("rule", "pocket-count"), id("rule", "pill-presence")],
      conditions: [],
      pocketSize: 8,
      createdAt: t,
      updatedAt: t,
      notes: "pass_count / pocket_count ≥ 0.98",
    },
  ];

  return [...cats, ...rules];
}

function readSeedFlag(): string | null {
  try {
    return window.localStorage.getItem(FLAG);
  } catch (err) {
    console.warn("[rules/seed] seed flag read failed", err);

    return null;
  }
}

function writeSeedFlag(): void {
  try {
    window.localStorage.setItem(FLAG, "1");
  } catch (err) {
    console.warn("[rules/seed] seed flag write failed", err);
  }
}

async function writeSeedRows(facade: RuleFacade, rows: readonly Rule[]): Promise<number> {
  let written = 0;
  for (const r of rows) {
    if (r.id === UNCATEGORIZED_RULE_ID && facade.get(UNCATEGORIZED_RULE_ID)) continue;
    try {
      await facade.save(r);
      written++;
    } catch (err) {
      console.warn("[rules/seed] skip row", r.id, err);
    }
  }

  return written;
}

async function runAutoSeedRulesIfEmpty(): Promise<number | null> {
  const hadFlag = readSeedFlag() === "1";
  const facade = makeRuleFacade();
  await facade.__hydrate();
  const existing = facade.list().filter((r) => r.id !== UNCATEGORIZED_RULE_ID);

  if (existing.length > 0) {
    writeSeedFlag();

    return null;
  }

  if (hadFlag) console.warn("[rules/seed] stale seed flag repaired empty library");
  const written = await writeSeedRows(facade, makeSeedRows());
  writeSeedFlag();
  console.info("[rules/seed] autoSeedRulesIfEmpty applied", { written });

  return written;
}

/**
 * Auto-seed the rules library. Idempotent by both a local flag and a
 * content check (any non-builtin rule present -> skip and mark done).
 * Returns count of rows written, or null if skipped.
 */
export async function autoSeedRulesIfEmpty(): Promise<number | null> {
  if (typeof window === "undefined") return null;

  if (inFlight) return inFlight;
  inFlight = runAutoSeedRulesIfEmpty().finally(() => {
    inFlight = null;
  });

  return inFlight;
}