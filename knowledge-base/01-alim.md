# Developer: alim01-alim

## User Request / Questions Asked

- Please read the codebase and try to understand what that is and create a folder in the root of the repo called knowledge-base.
- And there, write the name for developer alim01-alim.
- And you have to write the knowledge and the questions that I ask you, put the knowledge in there.
- So first of all, you should read the whole codebase, that should be the first idea. Try to have the whole idea, whole knowledge thing.
- Read the .lovable folder and all other related files that it mentions, and also the root README file.
- And also tell me the code quality, does this follow the modular approach and everything else?

## Codebase Knowledge

### Overview

This project, **Control Automation**, is a desktop-style Human-Machine Interface (HMI) for factory-floor operators doing camera-based inspection work.

- **Frontend:** Built with TanStack Start, React 19, Vite, and Tailwind v4. Located mostly in the `src/` directory.
- **Backend:** Built with Python (FastAPI HTTP surface), handling captures, validation rules, dispatcher/worker processes, and SDK facades. Located primarily in the `app/` and `BE/` directories.
- **Operating Modes:** Supports a "Seed mode" (local JSON fixtures, no backend needed) and a "Backend mode" (talking to a real Python backend).

### Project Structure & Modularity

The codebase is highly modular and strictly structured:

- `src/`: Frontend UI, hooks, components.
- `app/` & `BE/`: Backend core logic, rules engines, vendor capture SDK bridges.
- `.lovable/`: Tracks AI planning, memory, strict rules (`.lovable/memory/01-code-red.md`), and prompts. It serves as an open operating manual for AI agents.
- `spec/`: Extensive product and engineering specifications (e.g., error management, database conventions, design system).
- `tests/`: Organized rigorously by unit, integration, contract, and e2e tests.

### Code Quality Rules

The project enforces strict coding guidelines to maintain very high code quality:

- Functions must be 8 lines or less.
- Files must be 80-100 lines maximum.
- No nested `if` statements.
- TypeScript strictly forbids `any` / `unknown`.
- Errors must never be swallowed and must follow the `spec/03-error-manage/` envelope.
- Naming rules and structures are stringently enforced (e.g., lowercase, hyphen-separated, numeric-prefixed markdown files).
