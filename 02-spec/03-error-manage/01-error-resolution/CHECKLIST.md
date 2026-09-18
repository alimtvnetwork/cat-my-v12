# Turn-Exit Checklist

**Version:** 1.0  
**Mandate:** Agents MUST satisfy this 6-item gate before ending ANY turn that touches error paths.

1. [ ] Retro file created for every fix in this turn in `app-issues/`.
2. [ ] Retro registered/counted in `00-overview.md` inventory.
3. [ ] `04-verification-patterns` three-step run for every touched endpoint.
4. [ ] New file-path errors satisfy the Code Red template (path, reason, operation, module).
5. [ ] Cheat-sheet link surfaced in any new error UI.
6. [ ] Tests pass locally (`pytest` and `bunx vitest run`).
