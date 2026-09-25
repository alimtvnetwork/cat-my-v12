# Naming + Security Digest (Plan 39 Step 6)

## TS/JS File Naming (spec 02/08/04)

- General files: kebab-case.ts (api-client.ts)
- React components: PascalCase.tsx
- Hooks: use-{name}.ts (use-auth.ts)
- Tests: _.test.ts or _.spec.ts
- Types: kebab-case.types.ts
- Folders: kebab-case

## Cross-language (spec 02/08/01)

- No spaces, no special chars, lowercase folders (except C#)
- README/LICENSE UPPERCASE, config files lowercase

## Security: axios pinning (spec 02/11/01)

- APPROVED: 1.14.0 (preferred), 0.30.3 (legacy)
- BLOCKED: 1.14.1, 0.30.4, any unverified version
- Upgrades require manual approval
