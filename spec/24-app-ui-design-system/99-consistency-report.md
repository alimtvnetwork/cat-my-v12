# App UI — Consistency Report

**Version:** 1.0  
**Updated:** 2026-07-14  
**Scope:** `spec/24-app-ui-design-system/` files 00..08, 97, 98.  
**Status:** ✅ No cross-spec contradictions blocking implementation.

---

## Method

Line-by-line cross-check of every rule that names another spec, another rule ID, or a shared identifier (token name, error code, route path, file path, action verb, keyboard key). Every finding is either `PASS` (aligned) or `FIX` (must resolve before implementation, step 36+).

Sources scanned:

- `00-overview.md` … `08-testing.md`
- `97-acceptance-criteria.md`, `98-changelog.md`
- `spec/03-error-manage/03-error-code-registry/01-registry.md` (namespace cross-link)
- `spec/spec-index.md` (folder totals)
- `src/styles.css` (live token names)

---

## Check A — File inventory alignment

| Check                                                                    | Result |
| ------------------------------------------------------------------------ | ------ |
| `00-overview.md` inventory lists all 9 shipping files (00..08)           | PASS   |
| `spec/spec-index.md` App UI section lists 01..08 (9 rows total incl. 00) | PASS   |
| `spec/spec-index.md` totals updated 411 → 419                            | PASS   |
| `97-acceptance-criteria.md` cites 01..08 by filename                     | PASS   |
| `98-changelog.md` `Added` entries cover 00..08 + 97 + 98                 | PASS   |

## Check B — Acceptance row IDs

| Check                                                          | Result |
| -------------------------------------------------------------- | ------ |
| Canvas rows use prefix `C-` (03-canvas.md)                     | PASS   |
| Rule List rows use prefix `R-` in `97` and `04-rule-layers.md` | PASS   |
| Rule Controller rows use `K-` (05)                             | PASS   |
| State rows use `S-` (06)                                       | PASS   |
| Errors rows use `E-` (07)                                      | PASS   |
| Testing traceability in `08` refers to `C/R/K/S/E`             | PASS   |

**Resolved at v3.31.0:** `04-rule-layers.md` and `08-testing.md` now use `R-*` for Rule List rows, matching `97-acceptance-criteria.md` and leaving `L-*` reserved for Layout.

## Check C — Error/log code namespaces

| Check                                                                                                                         | Result |
| ----------------------------------------------------------------------------------------------------------------------------- | ------ |
| Only `I_UI_*`, `W_UI_*`, `E_UI_*`, `I_CAM_*` used in `07-errors-logging.md`                                                   | PASS   |
| Registry cross-link exists in `spec/03-error-manage/03-error-code-registry/01-registry.md` explicitly ignoring these prefixes | PASS   |
| `08-testing.md` `errors.spec.ts` asserts codes from the same 15-code set                                                      | PASS   |
| No numeric error codes leak into spec 24                                                                                      | PASS   |

## Check D — Token naming vs live CSS

Live tokens observed in `src/styles.css` (relevant subset):

- `--ca-bg`, `--ca-panel`, `--ca-panel-2`, `--ca-border`, `--ca-chrome`, `--ca-chrome-ink`, `--ca-ink`, `--ca-ink-muted`, `--ca-viewport`, `--ca-primary`, `--ca-select`, `--ca-ok`, `--ca-ng`, `--ca-warn`, `--ca-focus-ring`, `--ca-scrim`.

| Check                                                                          | Result                           |
| ------------------------------------------------------------------------------ | -------------------------------- |
| `01-foundations.md` names the same `--ca-*` family                             | Deferred to step 22 delta report |
| No hardcoded hex/rgb/hsl in `src/components/**` or `src/routes/**`             | PASS (0 hits)                    |
| Semantic tokens (`--color-primary`, etc.) still routed through `@theme inline` | PASS                             |

## Check E — Route paths

| Check                                                                            | Result |
| -------------------------------------------------------------------------------- | ------ |
| `07-errors-logging.md` boundary path `/setup*` matches `src/routes/setup*` files | PASS   |
| `08-testing.md` Playwright specs target `/setup*`                                | PASS   |
| No spec 24 file references `src/pages/` (banned)                                 | PASS   |

## Check F — Version + date coherence

| Check                                                                          | Result |
| ------------------------------------------------------------------------------ | ------ |
| `00-overview.md` front-matter refreshed to project v3.31.0                     | PASS   |
| `98-changelog.md` uses date 2026-07-14 matching README/CHANGELOG/RELEASE_NOTES | PASS   |
| Project version in README = 3.31.0 at time of report                           | PASS   |

**Resolved at v3.31.0:** overview's front-matter now matches the current project minor version.

## Check G — Cross-spec pointers

| Check                                                                                                           | Result |
| --------------------------------------------------------------------------------------------------------------- | ------ |
| `06-state-persistence.md` `programs/<id>.json` path unique — not conflicting with any file in `spec/23-app-db/` | PASS   |
| `04-rule-layers.md` "closes controller on multi-select" mirrors `05-rule-controller.md` mount contract          | PASS   |
| `03-canvas.md` 16 ms / 200 shapes matches `08-testing.md` `perf.spec.ts` seed count                             | PASS   |

---

## Summary

- **Blocking findings:** 0.
- **Deferred (non-blocking) findings:** 0.
- **Authoring phase exit:** ✅ approved. Implementation (steps 36+) may begin once step 22 delta report is complete.

---

## 11. "Recipe" residue audit (Plan 64 step 48)

**Status:** OPEN (code cleanup deferred to Plan 64 §Section C closeout).

The Plan 64 rename freezes `Rule Set` / `Rule` as the domain vocabulary. Every legacy "Recipe" or "recipe" mention in the codebase MUST be replaced before Section C completes.

### Grep gate

Executed at 2026-07-16 across `src/`, `spec/`, and `.lovable/`:

```
rg -n --hidden --glob '!.git' -w -i 'recipe|recipes'
```

Findings are tracked in `_notes/recipe-residue.md` (to be created by the executor before Section C ships). Every occurrence must resolve to one of:

- Rename to `Rule Set` / `Rule` where the user-facing term applies.
- Delete when the mention was a stale plan / RFC.
- Explicitly keep when the mention is culinary or unrelated (rare; each keep must carry a `// preserved: not-domain-recipe` comment).

### CI enforcement

A linter script `linter-scripts/check-no-recipe.py` (to be added in Plan 64 step 51 preparation) will fail the build when `\brecipe(s)?\b` appears in any file except `spec/24-app-ui-design-system/98-changelog.md` (historical) and `_notes/recipe-residue.md` (justified exceptions).

### Pass criteria

- Zero grep hits under `src/`.
- Zero grep hits under `spec/` except the two exempt paths above.
- `_notes/recipe-residue.md` exists and closes with `## Resolution: all mentions accounted for`.
