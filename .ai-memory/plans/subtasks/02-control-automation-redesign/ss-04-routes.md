# SS-04 — TanStack route scaffold

Parent: 02-control-automation-redesign
Status: pending
Created: 2026-07-09

File layout (flat, dot-separated):

```
src/routes/
  __root.tsx                 (existing — update head meta)
  index.tsx                  (Boot → redirect /setup)
  setup.tsx                  (layout, renders <Outlet />)
  setup.index.tsx            (Setup workspace, Screen A)
  setup.roi.tsx              (ROI editor overlay, Screen C)
  setup.reference.tsx        (Reference registration overlay, Screen D)
  settings.tsx               (layout)
  settings.camera.tsx        (Screen B)
  settings.trigger.tsx       (Screen B)
  settings.lighting.tsx      (Screen B)
  run.tsx                    (Screen F)
  errors.tsx                 (Screen E)
```

Rules:

- Every `createFileRoute("...")` string exactly matches its generated ID.
- Parent routes (`setup.tsx`, `settings.tsx`) render `<Outlet />`.
- Add per-route `head()` with distinct title/description; no og:image on `__root.tsx`.
- Locked routes (`/setup/*`, `/settings/*`) implement `beforeLoad` to redirect to `/run` when `runState.status === 'running'`.
- Never edit `src/routeTree.gen.ts`.
