# Step 26: forbidden-string sweep

Root cause: `src/components/hmi/ToolTile.tsx:27` used raw `text-white` on selected tile, violating SS-11 no-hardcoded-color rule (even though it happened to pass contrast).

Files read: sweep output for `bg-white`, `text-black`, `bg-black`, `text-white`, hex literals across `src/` (excluding `.gen.ts` and `styles.css`).

Findings:

- `src/lib/error-page.ts:9-16`: hex literals in a standalone plain-HTML error page (no Tailwind runtime). Kept, intentional isolation; documented as an allowed exception (system fatal-error fallback, not app UI).
- `src/components/hmi/ToolTile.tsx:27`: raw `text-white`. Fixed.

Change: replaced `text-white` with `text-ca-ink` in ToolTile selected state. Contrast ink on select = 8.00 (AA pass).

Guardrail: no new `text-white` / `bg-white` / hex literals should appear in `src/components/**` or `src/routes/**`. `src/lib/error-page.ts` is the sole documented exception (bootstrap error page).

Next 1 Step: Step 27, run axe/keyboard smoke via Playwright against `/setup` and `/run`.
