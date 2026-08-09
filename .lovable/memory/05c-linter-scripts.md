# Linter Scripts Memory

Source read for Plan 03 Step 7: every file under `linter-scripts/`, including top-level Python/shell/PowerShell scripts, readmes, allowlists, installer templates, examples, and tests.

## Entry points

- `linter-scripts/run.sh` is the POSIX entry point. It parses `--path`, `--max-lines`, `--json`, `--skip-linters`, and `--linters-only` at lines 16–37; runs `git pull` at lines 42–51; runs the Go coding-guidelines validator at lines 61–82; dispatches the spec/docs linters at lines 84–121; exits non-zero when validator or linter failures exist at lines 123–138.
- `linter-scripts/run.ps1` is the PowerShell parity entry point. Parameters are declared at lines 25–32; `git pull` runs at lines 42–55; the Go validator runs at lines 64–91; linter dispatch runs at lines 93–127; the failure summary and final exit are lines 129–143.

## Validator layer

- `linter-scripts/validate-guidelines.go` is the cross-language coding-guidelines validator. The enforced rule list is documented at lines 13–31, covering nested `if`, boolean naming, magic strings/numbers, function length, Go `apperror`, no string enums/error codes, immutability, raw `!`, boolean flag args, and style rules.
- Language detection covers Go, TypeScript/JavaScript, PHP, and Rust at `validate-guidelines.go` lines 81–97.
- The report model includes file, line, rule, severity, message, and snippet at `validate-guidelines.go` lines 50–67.

## CI/doc lint dispatch

`run.sh` lines 106–120 and `run.ps1` lines 112–126 dispatch these checks in order:

1. `check-tunable-constants.py`
2. `check-mws-error-codes.py`
3. `check-function-lengths.py`
4. `check-forbidden-strings.py`
5. `check-placeholder-comments.py`
6. `check-memory-mirror-drift.py`
7. `check-prompts-loaded.py`
8. `check-readme-canonicals.py`
9. `check-readme-install-section.py`
10. `check-root-readme.py`
11. `check-ui-backend-map.py`
12. `check-spec-cross-links.py`
13. `check-spec-folder-refs.py`
14. `check-axios-version.sh`
15. `check-forbidden-spec-paths.sh`
16. `check-runner-dispatch-antipatterns.sh`

## Important gates

- Forbidden strings are TOML-driven. `check-forbidden-strings.py` loads `linter-scripts/forbidden-strings.toml` at lines 28–38, excludes `.git/node_modules/dist/build` at line 28, walks the repo at lines 60–107, emits GitHub annotations at lines 127–140, and exits 1 on any finding at lines 146–151.
- Function-length enforcement is script-focused. `check-function-lengths.py` defines tiers at lines 8–15, waiver syntax at lines 17–26, discovers `scripts/` plus top-level runner files at lines 28–31 and 172–181, validates waivers at lines 135–149, and reports CI annotations at lines 184–199.
- Placeholder blocks are linted by `check-placeholder-comments.py`. Rules P-001 through P-007 are defined at lines 29–63; custom `<spec-placeholder>` behavior is lines 104–117; the changed-file audit statuses are lines 184–214.
- Prompt index drift is checked by `check-prompts-loaded.py`: expected index and prompt directory defaults are lines 44–45, orphan/dangling detection is lines 59–77, and missing index/directory errors are lines 105–126.
- Shell UI/backend map coverage is checked by `check-ui-backend-map.py`: it compares `05-ui-to-backend-map.md`, per-method Mermaid filenames, the method index, schema group files, and current route/HMI/ops caller files. `--strict-schema` also fails declared `*.req` / `*.res` / `*.stream` refs missing from schema `$defs`.
- Spec markdown links are checked by `check-spec-cross-links.py`: link/heading parsing is lines 24–30, code fences and placeholders are stripped at lines 54–109, allowlist loading is lines 112–126, scan logic is lines 182–214, and exit behavior is lines 246–260.
- Numbered spec-folder references are checked by `check-spec-folder-refs.py`: reference shapes are lines 29–35, allowlist categories are lines 10–18 and 62–73, stale-reference collection is lines 171–191, and fix guidance is lines 194–244.
- Tunable constants are checked by `check-tunable-constants.py`: T1–T4 rules are lines 5–21, setup/error contract is lines 23–31, scan targets are lines 38–45, and the main T1 scan flow is lines 136–177.
- Axios pinning is guarded by `check-axios-version.sh` lines 2–13, with blocked/approved versions documented at lines 8–9.
- Deprecated spec paths and uppercase markdown filenames are blocked by `check-forbidden-spec-paths.sh` lines 2–27.
- Fix-repo runner dispatch regressions are blocked by `check-runner-dispatch-antipatterns.sh` lines 2–18.

## Support files

- `allowlist-forbidden-string.py` updates `forbidden-strings.toml`; it documents explicit path mode, auto mode, dry-run, and re-verify flow at lines 30–45.
- `check-mws-error-codes.waivers.txt` and `check-mws-error-codes.unallocated.txt` are not generic skip lists; comments at lines 1–13 of each explain the exact catalogue/orphan/unallocated semantics.
- `installer-templates/Status.sh.tmpl` and `Status.ps1.tmpl` are status templates consumed by downstream installer scripts.
- `examples/rename-intake-audit.json` plus `validate-rename-intake.py` and `readme-rename-intake.md` define the rename-intake audit surface used by placeholder/diff workflows.
- `linter-scripts/tests/` covers changed-file audit parsing, deleted/ignored reason parity, diff shorthand, extension flags, similarity output, cache segregation, prompt loading, tunable T4, and rename-intake validation.

## How to use this memory

- Before editing docs/specs, check whether one of the 15 dispatched linters owns the invariant.
- Before adding a waiver, prefer the dedicated allowlist file for that linter and preserve its documented category/format.
- Before changing runner behavior, update both `run.sh` and `run.ps1` unless the change is intentionally platform-specific.
