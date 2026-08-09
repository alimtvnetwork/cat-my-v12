# Plan 39 read-phase inventory (v3.216.0 slice)

Plan 39 is a 30-step onboarding sweep of `spec/02-coding-guidelines/`,
`spec/03-error-manage/`, and `spec/21-app/`, followed by a `src/` walk and
three memory files (`20-product-model.md`, `21-code-map.md`, plus a diff
matrix). This slice does the inventory pass only, so future slices know
the actual counts before reading in depth.

## Spec inventory (verified this turn)

- `spec/21-app/`: 67 entries (files + subfolders). Steps 11-18 cover this tree.
- `spec/02-coding-guidelines/`: overview + 10 subfolders (`01-cross-language`,
  `02-typescript`, `03-golang`, `04-php`, `05-rust`, `06-ai-optimization`,
  `06-cicd-integration`, `07-csharp`, `08-file-folder-naming`, plus more).
  Note: two folders share the `06-` prefix; call that out in later slices,
  do not silently renumber.
- `spec/17-consolidated-guidelines/`: 33 files (cross-ref plan 38 memo).

## Source inventory (verified this turn)

- `src/routes/*.tsx`: 32 route files (flat dot-separated naming). Every
  page/leaf is a single file, no `src/pages/` directory (correct for
  TanStack Router).
- `src/lib/`: at least 15 first-level entries including `app-mode.ts`,
  `audit-export.functions.ts`, `capture.functions.ts`, `capture.server.ts`,
  `denial-burst-query.ts`, `denial-tuning.functions.ts`, plus subfolders
  (`ai-testing`, `camera`, `constants`, `diagnostics`, `editor`).
  Server-fn files use `*.functions.ts`; server-only helpers use
  `*.server.ts`; matches the template guardrail.

## Not landed this slice (honest)

- Steps 2-9 (deep reads of `02-coding-guidelines/` + `03-error-manage/`)
  are inventory-only, not deep-read. Future slices should read section by
  section, not claim completeness here.
- Steps 19-25 (`src/` walk) are one-shell-ls deep; nothing has been
  memorized yet.
- Steps 26-30 (`.lovable/memory/20-product-model.md`,
  `.lovable/memory/21-code-map.md`, UI + data gap matrices) not written
  this slice. No fabricated product model.
- Plan 39 stays in `.lovable/plans/pending/`.
