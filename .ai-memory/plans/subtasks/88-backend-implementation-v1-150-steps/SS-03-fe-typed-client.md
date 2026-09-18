---
Slug: fe-typed-client
Status: pending
Created: 2026-07-21
Parent: 88-backend-implementation-v1-150-steps
---

# SS-03: Frontend typed backend client + Seed adapter

Files:

- `src/lib/backend/types.ts` — `BackendClient` interface (all app-facing calls), `Envelope<T>`, `AppErrorShape`.
- `src/lib/backend/http.ts` — fetch wrapper, base-URL resolver, envelope decode, error -> `useErrorStore`.
- `src/lib/backend/httpClient.ts` — `HttpBackendClient` implements `BackendClient` against `BE/`.
- `src/lib/backend/seedClient.ts` — `SeedBackendClient` implements `BackendClient` from existing fixtures.
- `src/lib/backend/mode.ts` — `useBackendMode()` zustand store: `mode: 'seed' | 'backend'`, `baseUrl: string`, persist to `localStorage` key `app.backend.baseUrl` + `app.backend.mode`.
- `src/lib/backend/provider.tsx` — `BackendProvider` picks client from mode; `useBackend()` hook returns the active `BackendClient`.
- `src/lib/backend/__tests__/httpClient.test.ts` + `seedClient.test.ts`.

Rules:

- Components NEVER import `httpClient`/`seedClient` directly — only `useBackend()`.
- Base URL validated with a positive guard `isValidBackendPrefix(url)`; invalid -> mode falls back to seed with a toast.
- Every network error goes through registry `lookupErrorCode` and lands in `useErrorStore`.
