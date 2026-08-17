# Canonical Rule Engine Architecture

## Single Source of Truth
The canonical rule engine logic resides entirely in the Python backend (`BE/app/rules/`).
The frontend and any intermediate Node layers (`app/`) must NOT implement overlapping rule evaluation logic. They should only act as thin clients or orchestrators that call the backend evaluation endpoint.

## Architecture Guidelines
- **Backend (`BE/app/rules/`)**: Contains all parsing, evaluation, and execution of rules.
- **Node App (`app/`)**: Routes requests to the Python rule engine. Does not duplicate parsing or evaluation.
- **Frontend (`src/`)**: Consumes the results of the rule engine via strict Zod contracts.

## Motivation
Duplicating rule logic leads to "Dual Backend Confusion", where rules evaluate differently depending on where they are executed. This architecture enforces consistency and a single source of truth.
