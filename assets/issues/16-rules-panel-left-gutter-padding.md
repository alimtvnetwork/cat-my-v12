## Context

Why can't you remove this padding? I have been asking several times. What is the main reason that you cannot fix it? Can you please explain?

## Evidence

- `assets/ui/64-rules-panel-left-gutter-still-present.png` - User-highlighted screenshot showing the persistent vertical empty gutter before the Rules list content.

## Notes

- The highlighted gap appears before the Rules/Layers list content, so the likely source is not only row padding. It may be panel-shell chrome, dock/floating-window body padding, compact-density overrides, or the row drag-handle/order-badge columns combining into a visible gutter.
