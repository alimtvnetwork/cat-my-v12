---
name: Plan 73 step 32 - issue closure verification
description: Sweep of `.lovable/issues/*` statuses after closing 17-26; allowlist of intentionally-open older issues out of Plan 73 scope
type: reference
---

Command: `for f in .lovable/issues/*.md; do grep -Hi '^Status' $f | head -1; done`

Plan 73 targets (17-26): all `Status: closed`.

- 17 hover jitter (v3.486.0), 18 header dedup, 19 layer arrow (v3.488-489.0), 20 tools chevron (v3.491.0), 21 panel float (v3.492.0), 22 duplicate header audit (v3.494.0), 23 home steps (v3.495.0), 24 rules form (v3.496.0), 25 worker notice/error viz (v3.497.0), 26 seed facade (v3.500.0).

Intentionally-open (out of Plan 73 scope, tracked by other plans / superseded):

- 01 (closed, verbose status line)
- 09 setup UI not modern - superseded by Plan 68 (UI Improvements V2 Enhancement).
- 10 home nav - Status: resolved.
- 11 layers mixed - Plan 35 chain (57/58/59).
- 12 UI overlap - Plan 68 target.
- 13 home regression - superseded by issue 23 closure + Plan 65.
- 14 src-v3 rollback - Plan 36 chain.
- 15 global home menu - Plan 65 close-out (reverify).
- 16 project create flow - Plan 66 target (routes fix landed, needs re-audit).

Action: none for Plan 73. Older issues remain visible for their owning plans.
