# Maintenance Scripts Memory

Source read for Plan 03 Step 8: every file under `scripts/fix-repo/` and `scripts/visibility-change/`, both shell and PowerShell implementations.

## `scripts/fix-repo/` purpose

`fix-repo` is a repo-token maintenance utility. It detects a repository name like `<base>-vN`, finds older `<base>-vM` references, and rewrites them to the current version while skipping unsafe files.

## Fix-repo invariants

- Config is optional and JSON-based. Shell `config.sh` documents `ignoreDirs` and `ignorePatterns` at lines 4–11, resolves an explicit/default config at lines 37–45, loads arrays at lines 48–55, and tests directory/pattern ignores at lines 57–115.
- PowerShell parity lives in `Config.ps1`: same JSON contract at lines 4–11, explicit/default resolution at lines 20–32, import at lines 34–46, glob-to-regex conversion at lines 65–85, and final ignore decision at lines 97–102.
- File scanning skips unsafe content. Shell `file-scan.sh` caps files at 5 MB at line 4, blocks common binary extensions at lines 6–13, skips symlinks at lines 15–17, detects oversized files at lines 19–24, detects null bytes at lines 26–35, and combines all guards at lines 37–44.
- PowerShell `FileScan.ps1` mirrors those safety rules with binary extension list lines 7–13, 5 MB cap line 15, tracked-file discovery lines 17–25, binary-extension detection lines 27–31, null-byte detection lines 33–45, and skippable path detection lines 47–54.
- Repo identity detection supports HTTPS, SCP-style SSH, and `ssh://git@`. Shell `repo-identity.sh` reads repo root and remote at lines 4–13, parses URLs at lines 15–34, and splits `<repo>-vN` at lines 36–44. PowerShell `RepoIdentity.ps1` mirrors this at lines 7–21, 23–50, and 52–60.
- Rewrite targets are prior versions only. Shell `rewrite.sh` derives target versions from `current - span` through `current - 1` at lines 4–12 and avoids numeric overflow by not matching tokens followed by a digit at lines 14–35.
- Shell rewrite is dry-run aware: `rewrite_file` counts replacements per target and only calls `substitute_token_in_file` when `dry != 1` at `rewrite.sh` lines 62–76.
- PowerShell rewrite mirrors this: `Get-TargetVersions` is lines 7–13, negative-lookahead pattern is lines 15–19, and `Invoke-FileRewrite` only writes when `DryRun` is false at lines 30–44.

## `scripts/visibility-change/` purpose

`visibility-change` changes repository visibility through the official GitHub/GitLab CLIs, validates provider/slug from `origin`, requires an explicit confirmation for public changes, and verifies the final state.

## Visibility-change invariants

- Provider resolution is origin-based. Shell `provider.sh` reads origin at lines 4–6, maps GitHub/GitLab hosts at lines 19–34, and allows custom GitLab hosts through `VISIBILITY_GITLAB_HOSTS` at lines 8–17.
- PowerShell `Provider.ps1` mirrors provider resolution at lines 7–22 and reads the same `VISIBILITY_GITLAB_HOSTS` allowlist at lines 13–21.
- Owner/repo slug parsing supports HTTPS, SCP-style SSH, and `ssh://`. Shell `provider.sh` resolves slugs at lines 36–49; PowerShell `Provider.ps1` resolves slugs at lines 24–39.
- CLI availability and current visibility are explicit. Shell `provider.sh` checks command availability at lines 51–53 and reads current visibility with `gh repo view` or `glab repo view` at lines 55–64. PowerShell `Provider.ps1` mirrors this at lines 41–58.
- Apply uses provider-specific commands. Shell `apply.sh` uses `gh repo edit --accept-visibility-change-consequences` for GitHub and `glab repo edit` for GitLab at lines 4–11. PowerShell `Apply.ps1` mirrors the same commands at lines 7–15.
- Verification reads the remote state after apply. Shell `visibility_matches` is `apply.sh` lines 13–17; PowerShell `Test-VisibilityMatches` is `Apply.ps1` lines 17–21.
- Public visibility cannot be made non-interactively. Shell `confirm_public_change` returns false when stdin is not a terminal and requires typing `yes` at `apply.sh` lines 19–28. PowerShell `Confirm-PublicChange` returns false when input is redirected and requires `yes` at `Apply.ps1` lines 23–31.

## Safety rules for future edits

- Preserve shell/PowerShell parity unless a platform limitation is documented in the edited file.
- Preserve dry-run behavior in rewrite logic: count/report is allowed, writes are not.
- Do not widen scannable files casually; binary, symlink, null-byte, and >5 MB skips are safety boundaries.
- Do not bypass provider detection or public-change confirmation in visibility scripts.
- If a script swallows an external CLI failure, surface the command, provider/path/slug, and exit code in the log output.
