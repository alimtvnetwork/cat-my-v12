# Linters — CI Enforcement Layer

Folder: `linters/` (four language-specific ruleset containers). No linter runs against this TanStack Start project itself — they encode the org's cross-repo coding standards and are consumed by CI in sibling repos.

| Sub-folder       | File(s)                                                     | Language | Purpose                                                        |
| ---------------- | ----------------------------------------------------------- | -------- | -------------------------------------------------------------- |
| `golangci-lint/` | _(empty; placeholder for future `.golangci.yml`)_           | Go       | Reserved for `golangci-lint` config once Go rules are codified |
| `phpcs/`         | `coding-guidelines-ruleset.xml`                             | PHP      | PHP_CodeSniffer ruleset mirroring `spec/02-coding-guidelines/` |
| `sonarqube/`     | `coding-guidelines-profile.xml`, `sonar-project.properties` | Multi    | SonarQube quality profile + project config                     |
| `stylecop/`      | `coding-guidelines.ruleset`                                 | C#       | StyleCop analyzer ruleset                                      |

## Rules

- Treat these files as **generated artifacts** of `spec/02-coding-guidelines/` and `spec/17-consolidated-guidelines/02-coding-guidelines.md`. Never edit a ruleset in isolation — update the spec first, then regenerate/mirror.
- The authoring guide for these files is `spec/17-consolidated-guidelines/27-linter-authoring-guide.md`.
- Rulesets are consumed cross-repo; a breaking change here affects downstream CI. Bump the linter authoring guide version when semantics change.
- Linter execution scripts (Python/shell wrappers) live in the sibling `linter-scripts/` folder — see `.lovable/memory/05c-linter-scripts.md` (pending Step 7).
