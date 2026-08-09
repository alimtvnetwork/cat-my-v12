/**
 * Plan 64 step 91: PascalCase-in-storage, Title-Case-with-spaces in UI.
 *
 * Root cause of the current label leaks: many surfaces render raw storage
 * identifiers (`FlawDetection`, `barcode_qr`, `edge-pitch`) directly. Spec
 * 24 (Naming) mandates spaced human-readable labels. This helper is the
 * single point where PascalCase / snake_case / kebab-case become UI text.
 *
 * Deliberately pure and dependency-free so it can be used at module scope
 * in route staticData (breadcrumb tokens, step 92) as well as at runtime.
 */

/** Split "FlawDetection" into ["Flaw","Detection"]; "barcode_qr" into ["Barcode","Qr"]. */
export function splitLabelParts(input: string): string[] {
  if (!input) return [];
  const spaced = input
    .replace(/[_-]+/g, " ")
    // insert a space before a run of uppercase followed by a lowercase (Rectangular OCR -> Rectangular OCR untouched, RectangularOcr -> Rectangular Ocr)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    // handle acronym boundary like "OCRRule" -> "OCR Rule"
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");

  return spaced.split(/\s+/).filter(Boolean);
}

/** Canonical form: "flaw_detection" -> "Flaw Detection". Keeps known acronyms uppercase. */
const ACRONYMS = new Set(["OCR", "QR", "SVG", "JS", "AI", "SDK", "URL", "ID", "UI"]);

export function formatLabel(input: string): string {
  const parts = splitLabelParts(input);

  return parts
    .map((p) => {
      const up = p.toUpperCase();

      if (ACRONYMS.has(up)) return up;

      if (/^[A-Z0-9]{2,}$/.test(p)) return p; // already an acronym in source

      return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    })
    .join(" ");
}

/** Register a project-specific acronym so it survives capitalisation. */
export function registerAcronym(word: string): void {
  ACRONYMS.add(word.toUpperCase());
}
