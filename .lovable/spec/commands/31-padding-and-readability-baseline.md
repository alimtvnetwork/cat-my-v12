# Padding + Readability Baseline

Scope: every panel, dialog, section, toolbar.

## Commands

- Section header padding: min `px-4 py-3`.
- Toolbar cluster padding: `px-2` inner, `gap-2` between clusters, `gap-1` inside a cluster.
- Button padding: `h-8 px-3` default; `h-7 px-2` compact; never below `h-6`.
- Row density: min 22px, target 24-28px; never smaller than 22px anywhere.
- Text: 13px value / 12px label minimum. Do not use `text-[10px]` or `text-[11px]`
  for anything a user must read.
- No two breadcrumbs on the same screen. Titlebar breadcrumb OR page breadcrumb,
  never both.
- Reference image folder for Plan 82 visuals:
  `spec/21-app/53-ui-improvements-v4-assets/plan82/` (upload-71..76.png).
