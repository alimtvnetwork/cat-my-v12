---
name: self-looping-next
description: Autonomous self-looping execution when prompted with 'next' or 'continue' across pending plan tasks.
---

# Autonomous Self-Looping via Next

## Overview
When the user says "next" or "continue", the agent executes consecutive pending subtasks autonomously without waiting for individual prompts, unless a breakage or failure occurs.

## Execution Pattern
1. Read current active plan in `.ai-memory/plans/pending/`.
2. Pick the next unexecuted step or subtask.
3. Execute within 5–8 file micro-batches.
4. Run validation gates (`guidelines:check`, `pytest`, `typecheck`).
5. Update plan progress and logs.
6. Continue to next step until plan completion or failure.
