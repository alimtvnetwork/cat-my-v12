# Commit & Formatting Rules

## 1. Single Unified Commits
When performing massive or multi-file refactors, **NEVER** create hundreds of single-file commits (e.g., one commit per file). 
You must **squash** or merge the changes into a single unified commit before pushing. This keeps the Git log clean and prevents Lovable syncs from being overwhelmed.

## 2. Newline Rule Exception (Single-Statement Blocks)
The rule states: "One blank line before every return or throw, unless it is the only statement in the block."
**CRITICAL:** If a function or block is completely empty aside from the `return` or `throw` (e.g., a one-liner arrow function, or a function where `return` is the very first line after `{`), you **MUST NOT** insert a blank line. 
Empty functions and single-statement blocks should remain compact without rogue newlines.
