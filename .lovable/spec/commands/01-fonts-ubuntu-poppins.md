---
Slug: fonts-ubuntu-poppins
Status: open
Created: 2026-07-14
Scope: app UI (src/routes/**, src/components/**, src/styles.css, __root.tsx head links)
---

# Command — Header font Ubuntu, body font Poppins

Verbatim: "header Ubuntu, and all the body fonts needs to be Poppins".

## Rule

- Header / display text (h1–h6, section titles, tool tile titles, dialog titles) MUST use `Ubuntu`.
- All body / UI copy (paragraphs, labels, buttons, inputs, table cells, menu items) MUST use `Poppins`.
- Register both families as design tokens in `src/styles.css` under `@theme` (`--font-display: "Ubuntu"`, `--font-sans: "Poppins"`).
- Load the fonts with `<link rel="stylesheet">` tags in `src/routes/__root.tsx` head (never `@import` a URL in `src/styles.css`; Lightning CSS resolves imports from the filesystem).
- No component may hardcode `font-family`. Use the `font-display` / `font-sans` utilities the theme generates.

## When it applies

Every UI task from 2026-07-14 forward until a superseding command is captured under `.lovable/spec/commands/`.
