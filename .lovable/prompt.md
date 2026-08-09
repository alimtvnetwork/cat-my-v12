# .lovable/prompt.md: Prompt Registry

Central reference to all reusable prompts stored under `.lovable/prompts/`.

## Aliases

| Trigger phrase                                                | Prompt file                                                                           |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `read memory`                                                 | [`.lovable/prompts/32-read-memory.md`](./prompts/32-read-memory.md)                   |
| `next task` / `next 2 steps`                                  | [`.lovable/prompts/354-next-task.md`](./prompts/354-next-task.md) (latest)            |
| `initial instructions` / `follow this instruction … 50 steps` | [`.lovable/prompts/38-initial-instructions.md`](./prompts/38-initial-instructions.md) |

## Notes

- Saying **"read memory"** MUST trigger the full onboarding sequence in `32-read-memory.md`.
- New prompts go under `.lovable/prompts/NN-slug.md` and must be registered here.
