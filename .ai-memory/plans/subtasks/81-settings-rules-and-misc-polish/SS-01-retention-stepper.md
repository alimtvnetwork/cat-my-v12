# Retention stepper subtask

Slug: retention-stepper
Parent: 81-settings-rules-and-misc-polish
Status: pending
Created: 2026-07-18

## Scope

Replace raw number inputs for audit retention days and size cap in `src/routes/settings.index.tsx` with a reusable `<Stepper>` primitive plus quick-preset chip row.

## Details

- New file: `src/components/settings/Stepper.tsx`. Props: value, onChange, min, max, step, unit, presets, format.
- Long-press on +/- accelerates step by 10x after 400ms.
- Keyboard: ArrowUp/Down step, PageUp/PageDown x10, Home/End clamp.
- Retention days presets: 30, 90, 365, 1825.
- Retention size presets (MB): 128, 512, 2048, 10240 formatted as "128 MB" / "10 GB".
- Emit showToastError on clamp.
- Unit tests: clamp, preset click, long-press acceleration timing.
