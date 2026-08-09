# prompts.md

Short rules for `xx-next-task.md` files (the numbered "next task" notes
under `.lovable/prompts/`).

## What they are

Each file is a pinned handoff for the _next_ AI session: what to do next,
why, and what it unblocks. One file per turn. Filename pattern:

```
.lovable/prompts/<NNN>-next-task.md
```

`NNN` is a monotonic 3-digit counter (`355`, `356`, ...). Never reuse a
number. Never rewrite a past file; write a new one.

## When to write one

Write a new `<NNN>-next-task.md` at the end of every session where you:

1. Finished a chunk of work AND
2. Know the concrete next 1 or 2 steps AND
3. Would lose meaningful context if the next AI session read only the diff.

Skip it for pure chat, doc typos, or one-shot fixes with no follow-up.

## What it must contain

Keep it short (roughly 20 to 60 lines). Required sections:

- **Next 2 steps**: exactly two. For each: reasoning, time estimate,
  what it unblocks.
- **Then**: bullet list of every remaining item after those two, so the
  next session sees the full picture.
- **Context pointers**: file paths, spec sections, or memory keys the
  next session must read first.

Optional: open questions, known risks, decisions still pending.

## What to update in the same commit

- `.lovable/prompt.md`: point its "current pinned prompt" line at the new
  `<NNN>-next-task.md`.
- `readme.md`, `changelog.md`, `release_notes.md`: only when the work
  itself moved the version or the top-level task list.
- Any spec `98-changelog.md` touched by the work.

## What not to do

- Do not delete or edit older `<NNN>-next-task.md` files. They are the
  audit trail.
- Do not stuff long design discussion in here. Put that in `spec/` or
  under `spec/*/_notes/` and link to it.
- Do not restate the whole plan; only the next 2 steps plus the tail.

## Cross-references

- Full onboarding map: `.lovable/what-to-read.md`
- Memory index: `.lovable/memory/index.md`
- Pinned prompt: `.lovable/prompt.md`
