---
name: cicd-lint-integration
description: Continuous integration, lint integration, strict typing, and validation gate workflow (Command 24).
---

# CI/CD Lint Integration & Validation Gates

## Overview
Standards and commands for continuous integration gates across TypeScript and Python codebases.

## Core Mandates
1. Never disable or bypass CI/CD checks or GitHub Actions workflows.
2. Mandatory checks before committing:
   - Frontend: `npm run lint`, `npx tsc --noEmit`, `bash scripts/check-magic-strings.sh --strict`.
   - Backend: `python -m pytest BE/tests -x --tb=short`.
   - Spec cross-links: `python linter-scripts/check-spec-cross-links.py`.
3. Fix underlying code causes instead of weakening linters or allowlists.
