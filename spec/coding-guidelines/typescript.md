# TypeScript Coding Guidelines

Status: locked
Owner: Plan 22 Step 49 remediation
Applies to: `src/**/*.ts`, `src/**/*.tsx`, TypeScript tests

## Required references

- `.lovable/coding-guidelines/coding-guidelines.md`
- `spec/02-coding-guidelines/02-typescript/97-acceptance-criteria.md`
- `spec/21-app/40-error-manage.md` Appendix A
- `spec/21-app/52-sdk-facade-pattern.md`

## Type and component rules

1. Use strict, named types. Avoid `any`; narrow `unknown` at trust boundaries.
2. Enum-like values crossing a boundary use PascalCase strings unless they are wire `E_*`, `W_*`, or `I_*` codes.
3. React components stay small and reusable. Multi-component features require a Mermaid component diagram in the spec.
4. UI tokens come from `--hmi-*` variables. Do not hardcode colors, spacing, or radius values.
5. Visible state changes use background or label state, not icon swap alone.

## Server function rules

1. Import `createServerFn` from `@tanstack/react-start`.
2. Place app-internal server functions in client-safe `*.functions.ts` modules.
3. Read secrets inside `.handler()` only.
4. Use Zod validators for all inputs and outputs that cross the server boundary.
5. Protected server functions must use the existing auth middleware and must not be called from public route loaders.

## Error and correlation rules

| Boundary               | Required fields                                                               |
| ---------------------- | ----------------------------------------------------------------------------- |
| Server function error  | `code`, `message`, `correlationId`, `operation`                               |
| Capture error envelope | `Code`, `Vendor`, `Serial`, `CorrelationId`, `Retryable`                      |
| Audit event            | `eventId`, `ts`, `category`, `reasonCode`, `retentionPolicy`, `correlationId` |

## Facade rules

1. Browser components call typed server functions or hooks only.
2. Components never import `*.server.ts` helpers.
3. SDK and persistence details remain behind named facades from spec 52.
4. Feature gates call `requireFeature("Name")` or the typed equivalent from the licensing module.

## Acceptance checklist

- [ ] Route file has route-specific title and description when applicable.
- [ ] Server function input is Zod-validated.
- [ ] Protected server function is not called during public SSR.
- [ ] Error envelopes carry a correlation id.
- [ ] UI uses `--hmi-*` tokens only.
