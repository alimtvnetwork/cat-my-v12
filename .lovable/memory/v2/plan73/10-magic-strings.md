---
name: Plan 73 step 34 - magic-strings enumeration
description: Output of `scripts/check-magic-strings.sh` before Plan 73 step 35 replacement pass
type: reference
---

Command: `bash scripts/check-magic-strings.sh`

Script scope: `src/` minus `src/lib/constants/**` and `src/routeTree.gen.ts`.
Guarded pattern groups: `HttpMethod`, `StorageKey`, `AppEvent`.

Advisory-mode output (pre-fix):

```
== HttpMethod violations ==
src/lib/errors/__tests__/export.test.ts:19:    method: "POST",
src/components/editor/validation/WorkerHealthBanner.tsx:65:        method: "GET",
```

`StorageKey` and `AppEvent` groups: zero hits. Prior slices (43 slice 2, Plan 44/45) already migrated those namespaces.

Top-20 target from Plan 73 step 35 collapses to top-2 because the guarded universe only had 2 residual violations. No additional constants leaf needs authoring; both fits map onto the existing `HttpMethod` const in `src/lib/constants/http.ts`.
