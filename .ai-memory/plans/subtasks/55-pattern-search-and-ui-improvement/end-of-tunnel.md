# End of tunnel — spec 55 waves 1, 2, 3

Status: COMPLETE. All three waves verified green on origin/main.
Final HEAD: 1a9d25b0. CI run 41177039803: success, all 11 jobs green.
Verify-install run 41177039786: success.

## Local numbers (final verification pass)

- tsc: 0 errors
- eslint: 0 errors, 172 warnings (pre-existing)
- magic-strings check: clean
- ruff: all checks passed
- pytest: 1558 passed, 9 skipped (spec 54 baseline, exact)
- vitest: 1837 passed, 0 failed, 284 files
- E2E spec 54: 115/115 (cli 37, live 19, static 59)

## Commits pushed by this wave

- 918301b7 — tsc fixes, pytest version move, analyzer presence/search
  fixes, toolbar preset restore, pattern fixtures re-taught, conveyor
  tests on real buffers.
- 6ca567c4 — BE/openapi.snapshot.json regenerated (version 4.113.9,
  Pin1Options.GreyscaleMode).
- 1a9d25b0 — snapshot prettier-formatted; drift check made semantic
  (parsed JSON equality) so both gates can pass together.

## Regressions fixed (all real code fixes, no test skipped or weakened)

- Bot commit c5a9c1bf ran the presence gate on the filtered
  (binarized) image — fixed to read raw rgba for presence only.
- Bot commit c5a9c1bf squared every saved search region at
  evaluation — saved regions are now restored after pinning.
- Bot commit c5a9c1bf deleted the toolbar inline Quick Presets +
  Upload — restored verbatim.
- Pattern fixtures (DEFAULT grid, MEGA letters) never corresponded
  to the golden photo's pixels — re-taught from the photo with the
  analyzer's own matcher inputs; teach helper clamps dims to >=4px
  exactly as parseBoxesFromParams does.
- Conveyor synthesis deleted by wave 1 — tests now use real
  golden/white buffers; fabricated STM8 4/16.7/20 replaced by
  measured 0/0/24.

## Test expectations moved (owner-ordered only)

- BE version 0.1.0 -> 4.113.9 (spec 55 section 13).
- Dark-package message wording (spec 55 section 14 AND verdict).
- No-expectedLuma: Fail/0 -> Pass/3 + re-teach warning (section 15
  supersedes T102 section 4).
- isSimulating default true -> false (section 14).
- Conveyor eval/phase numbers (section 14 no-frame honesty).
- 5-box empty side: exact 0 -> matchedCount < 5 + FAIL verdict
  (pocket-edge features repeat across photos; luma discriminates).

## Still open (not this wave's scope, do not fake)

- Toolbar badge pass-through (needs rule-store plumbing).
- Taught-box caller wiring for conveyor/carrier.
- WhiteBoxMarkingTool patternRegion display vs. formulated region.
- BE white-box MarkingOptions mode support.
- Full res-mismatch compensation (deferred rule re-tuning pass).
- T104 expectedCount-vs-edgeCount semantics (owner decision).
- MBUD items 2-13, live-UI checks on the owner's machine.
- PowerShell machine syntax: covered by CI Pester +
  PSScriptAnalyzer jobs (both green); no PowerShell on this VM.
