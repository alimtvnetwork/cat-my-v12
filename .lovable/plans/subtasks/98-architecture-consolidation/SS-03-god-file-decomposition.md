# SS-03 — God-File Decomposition

**Plan:** 98  
**Status:** Pending  
**Parallel:** Yes (Wave 1)

---

## Problem

Coding guidelines (`spec/02-coding-guidelines/00-overview.md`):

- Files < **300 lines**
- React components < **100 lines**

Violations observed:

| File | ~Lines | Issues |
|------|--------|--------|
| `src/routes/__root.tsx` | 762 | Boot, seed orchestration, error providers, shell layout |
| `src/components/projects/ProjectEditorSections.tsx` | 1,112 | UI + business logic monolith |

These files are high-churn and hard to test in isolation.

---

## Target Structure

### `__root.tsx` extraction

Move to new modules under `src/lib/boot/`:

```
src/lib/boot/
  install-global-errors.ts      # installGlobalErrorCapture, error store wiring
  seed-orchestration.ts         # runAllSeeders, boot reconcile triggers
  root-providers.tsx            # Composed provider tree (Error, Seed, Backend, Theme)
  root-shell-layout.tsx         # Nav, sidebar, outlet chrome
```

`__root.tsx` becomes: route definition + `<RootProviders><RootShellLayout /></RootProviders>` only.

### `ProjectEditorSections.tsx` extraction

Split by section responsibility:

```
src/components/projects/sections/
  ProjectMetadataSection.tsx
  ProjectRulesetsSection.tsx
  ProjectCategoriesSection.tsx
  ProjectTrialsSection.tsx
  index.ts                      # thin composer <ProjectEditorSections />
```

Each file ≤100 lines; shared types in `src/lib/projects/editor-sections.types.ts`.

---

## Steps

1. Add characterization tests for current boot behavior (seed flags, error boundary mount) if missing
2. Extract `__root.tsx` in 3 PR-sized commits (errors → seed → layout)
3. Extract `ProjectEditorSections` one section at a time
4. Run `bun run guidelines:check` after each extraction
5. Verify no duplicate headers (`E_SHELL_DUPLICATE_HEADER` dev invariant)

---

## Acceptance

- [ ] `src/routes/__root.tsx` ≤ 300 lines
- [ ] `ProjectEditorSections.tsx` ≤ 100 lines (or deleted in favor of composer)
- [ ] All extracted modules ≤ 300 lines
- [ ] Existing unit/E2E tests pass; add tests for extracted boot helpers where logic moved

---

## Verification

```bash
bun run guidelines:check
bun run visual:test --grep "home|project"
```

---

## Risk

Root route refactor can break seed boot order. Mitigate with orchestrator tests in `src/lib/seed/__tests__/orchestrator.test.ts` extended to cover extracted module.
