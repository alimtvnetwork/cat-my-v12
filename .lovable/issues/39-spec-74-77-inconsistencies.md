# Issue 39: Spec 74/75/76/77 internal inconsistencies (plan-90 Step 1 audit)

Status: open
Filed: 2026-07-21
Source: `.lovable/plans/pending/90-worker-and-processing-cli.md` Step 1
Blocks: plan-90 Steps 8-70 (code should not encode a schema the spec contradicts)

## Context

Plan 90 Step 1 requires reading `spec/21-app/74-77` end-to-end and filing any spec inconsistencies before code lands. Doing the read surfaced six real contradictions between the four files. Each one would cause code + tests to diverge from a spec they claim to satisfy.

## Findings

### F1. JSONL field-name casing contradiction (74 vs 76)

- `spec/21-app/74-worker-cli.md:32` acceptance #3 lists fields as lowercase snake: `ts`, `level`, `event`, `code`, `msg`, `ctx`, `run_id`.
- `spec/21-app/76-cli-log-and-ipc.md:28-42` defines them PascalCase (`Ts`, `Level`, `Event`, `Code`, `Msg`, `Ctx`, `RunId`) and Rule 2 (`76:46`) says "Field names PascalCase (matches Universal Envelope convention)".

Fix: patch 74 acceptance #3 to reference 76's schema by link, remove the divergent field list. Same patch needed if 75 ever restates the schema (it currently just says "identical schema to Worker CLI", which is fine once 74 is fixed).

### F2. IPC message-Kind casing contradiction (74/75 vs 76)

- `74:33` acceptance #4: "emits `frame_ready` IPC message".
- `75:30` acceptance #2: "processes each `frame_ready` message ... writes `result_ready`".
- `76:93` defines `Kind: "FrameReady|ResultReady|Heartbeat|Error"` (PascalCase, matches envelope convention).

Fix: 74 -> `FrameReady`; 75 -> `FrameReady` / `ResultReady`.

### F3. Missing `E_IPC_*` in Processing CLI allowed-code list (75)

- `75:33` acceptance #5: "Error codes limited to `E_RULE_*`, `E_BE_*`, `E_CLI_*`."
- `75:30` acceptance #2 makes `watch` a first-class subcommand; it writes/reads IPC messages and MUST be allowed to raise `E_IPC_UNKNOWN_KIND`, `E_IPC_PAYLOAD_INVALID`, `E_IPC_WRITE_FAILED` (all added in plan-90 Step 10).
- `75:36` doctor also checks "IPC dir writable" -> `E_IPC_WRITE_FAILED` on failure.

Fix: expand 75 acceptance #5 to `E_RULE_*`, `E_BE_*`, `E_CLI_*`, `E_IPC_*`, `E_LOG_*`.

### F4. Release-asset count contradiction (77)

- `77:20-31` release-artefacts list enumerates 9 items: 4 binary archives + `SHA256SUMS.txt` + `SHA256SUMS.txt.asc` + `install.ps1` + `install.sh` + `release-notes.md`.
- `77:67` acceptance #2 says "all 8 assets + `install.ps1` + `install.sh` + `SHA256SUMS.txt`".

"8 assets" is wrong on both readings: the release ships 4 binary archives, not 8. The acceptance sentence also double-counts `install.ps1`/`install.sh`/`SHA256SUMS.txt`, which are already in the release-artefacts list above it.

Fix: rewrite 77 acceptance #2 as "Tagging `v0.1.0` triggers `release.yml` which publishes every artefact enumerated in the Release Artefacts section on the GitHub release page." No literal count.

### F5. Root DB `cli_invocations` ownership (76)

- `76:122` says Root DB owners are "Worker CLI + main app", but plan-90 Step 16 has Processing CLI writing `session.start`/`session.end` records that resolve to `cli_invocations` rows too.

Fix: change owner cell to "All CLIs + main app" for the Root DB row (or move `cli_invocations` to its own row).

### F6. Install-manifest path unspecified (77)

- `77:41-43` steps 5-7 install to `Programs\vision-app\<version>\` and update `Programs\vision-app\current\` PATH junction, but the location of `install.json` is unspecified. Is it per-version (`.../<version>/install.json`) or global (`.../install.json`)?

Fix: pick per-version + a global pointer, so uninstall can find the manifest for every installed version. Codify in 77 §"PowerShell installer" step 7.

## Non-findings (checked and clean)

- 74/75 exit-code mapping (`0/2/3/4/5`) is consistent.
- 76 log storage default paths agree with plan-90 Step 13.
- 76 seedable-config layer order matches plan-90 Step 3 assumption.
- Ambiguity 01 (`code need to follow guidelines`) does not affect this spec pair; it affects retro-audit scope.

## Suggested resolution order

1. Patch 74, 75, 76, 77 for F1-F6 in one commit before any code work starts (plan-90 Steps 8+).
2. Close this issue by moving to `.lovable/issues/closed/` and appending a `## Resolution` block linking the patching commit.
3. No plan-90 step needs renumbering; findings only tighten the specs.

## Evidence

- `spec/21-app/74-worker-cli.md` (59 lines, read in full)
- `spec/21-app/75-processing-cli.md` (57 lines, read in full)
- `spec/21-app/76-cli-log-and-ipc.md` (152 lines, read in full)
- `spec/21-app/77-cli-powershell-and-release.md` (85 lines, read in full)
