## Context

Why still having this padding issue? Can you please fix it

## Evidence

- `assets/ui/66-rules-panel-left-gutter-persists.png` - User-highlighted screenshot showing the Rules panel still has a visible empty vertical gutter before the Rules content.

## Notes

- This is the same visible left gutter family as `assets/issues/16-rules-panel-left-gutter-padding.md`, but the latest screenshot shows the empty strip remains before both the section header and rule rows.
- The likely source is now the panel/list shell or nested rail header padding, not only the rule row drag handle or execution-order badge.
