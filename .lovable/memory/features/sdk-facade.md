# SDK Facade

Describes the raw `sdk/` vs facade layers rule.

- HTTP handlers in `BE/routes/**` MUST call `BE/sdk_facade/**`. Never import from repo-root `sdk/` directly.
- Vendor SDK handles must not cross the facade boundary. Copy buffers before releasing SDK memory.
- Every error at the boundary uses one wire code from `spec/21-app/40-error-manage.md`.
