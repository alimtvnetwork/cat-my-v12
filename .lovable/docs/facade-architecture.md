# Vision Facade Architecture

## Overview

The Vision System uses a dual-mode Facade pattern to support both real hardware (API mode) and demo environments (Seed mode) without changing consumer code.

## How It Works

```
Consumer Component
      |
      v
getVisionFacade()        ← Factory: reads getActiveProfile()
      |
  +---+---+
  |       |
  v       v
ApiVisionFacade    MockVisionFacade
(hardware/BE)       (seed/demo)
      |                  |
fetchBackend()      Returns fixtures
      |
  FastAPI BE
  /camera/*, /images/*
```

## Key Files

| File | Role |
|---|---|
| [`vision-facade.ts`](../../../src/lib/facades/vision-facade.ts) | Main facade factory + both implementations |
| [`use-vision-api.ts`](../../../src/hooks/use-vision-api.ts) | TanStack Query wrappers for vision calls |
| [`useRuleDrafts.ts`](../../../src/hooks/useRuleDrafts.ts) | IndexedDB draft persistence |
| [`BE/src/api/camera.py`](../../../BE/src/api/camera.py) | `/camera/*` FastAPI routes |
| [`BE/src/api/images.py`](../../../BE/src/api/images.py) | `/images/reference` FastAPI route |

## Rules

1. **Never call `fetchBackend()` directly from a component**. Always go through a Facade method.
2. **Seed mode returns fixtures** — no network, no real hardware.
3. **Profile switching** is controlled by `useBackendMode` Zustand store (persisted via `zustand/middleware/persist`).
4. **Error mapping**: All backend errors MUST be registered in `src/lib/errors/api-codes.ts` with a label, category, notification type.

## Adding a New Facade Method

1. Add to `VisionFacade` interface.
2. Implement in `ApiVisionFacade` (calls `fetchBackend()`).
3. Implement in `MockVisionFacade` (returns fixture data).
4. Export a query/mutation wrapper in `use-vision-api.ts`.
5. Register any new `E_*` error code in `api-codes.ts`.
