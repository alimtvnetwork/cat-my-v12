# Command: Blind-AI Audit Conventions

Scope: All future audits of `spec/21-app/` and any new spec authoring.
When: From this command forward, until explicitly superseded.

Rules (verbatim from user, normalized):

1. The audit target audience is a "blind AI": a non-frontier model with only the `spec/` folder in context. No repo access, no chat history, no tribal knowledge.
2. Every spec file MUST include an explicit implementation checklist so the blind AI cannot silently skip a requirement.
3. Every enum, verdict, tier, status, error code discriminator, and named state MUST be PascalCase. Reject snake*case or SCREAMING_SNAKE in prose specs (error codes `E*\*` stay as-is because they are stable wire identifiers).
4. Every image referenced by a spec MUST have an inline textual description explaining what the blind AI is seeing (regions, colors, meaning) so implementation is possible without opening the image.
5. Every spec that persists state MUST include a database structure section (tables, columns, types, indexes, RLS/GRANT posture, or a Mermaid ER diagram). If the spec has no persistence, it must say so explicitly.
6. SDK integrations MUST follow the Facade pattern (spec 52) with `<Vendor><Domain>SdkFacade` naming and `Cat`-prefixed domain objects. Audits must flag any spec that discusses vendor SDKs without naming the facade.
7. Audit output layout in `spec/25-app-audit/`:
   - Wipe existing contents before starting.
   - Single-digit-padded sequence: `00-overview.md`, `01-rubric.md`, `02-scope.md`, then one file per audited spec (`03-issue-<slug>.md` ...).
   - Each per-spec file records score, what is missing, what needs to be fixed, how to improve for a blind AI, in a checklist format.
8. Every audit finding must be actionable by a blind AI reading only that finding file, no cross-context required.

Enforcement: This command file is authoritative. Any audit plan that violates it must be rewritten.
