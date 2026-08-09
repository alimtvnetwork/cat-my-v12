"""BE.app: domain models + facade seam.

Per `spec/21-app/52-sdk-facade-pattern.md` and
`spec/21-app/backend-implementation-request-v1.md`:
- `BE.app.domain.*`  -> `Cat*` domain dataclasses (wire-shaped, no vendor types).
- `BE.app.facades.*` -> Protocols + adapters. The ONLY package allowed to
  translate vendor SDK objects into `Cat*` and back. Routes / workers import
  from here, never from `sdk/**` directly.
"""
