# Issue 17: Rules row hover "glues"/shifts the badge position

## Context

> Here, when I hover over, it just goes a bit of right-hand side, which I actually
> instructed you before. You cannot move the position of the item. That looks really
> bad. Uh, it can have animation and fully hover effect with a different color.
> Uh, that's absolutely fine, but you cannot do that, what you're just doing, what
> you are right now doing. Gluing effect is very bad. So don't do that. So make
> things better here. Okay. I, I don't want to repeat it, so try to create the
> issues and then fix it. And also in the property section, things are broken.
> Firstly, start with the issues and then fix it if it's stupid

## Evidence

- `assets/ui/65-rules-row-hover-shifts-right.png`, hovered "Right pin bank" row: order badge "2" jumps from vertical-center to top-left corner, drag-handle dots appear at left edge; visually reads as content sliding right vs. rows 1/3/4.

## Root cause

`src/styles.css` lines 2040-2048 reposition `.editor-rule-order-badge` on hover/focus/selected: `top: 2px; transform: none;` moves the badge from center-left to top-left corner. Combined with the drag-handle overlay fading in at `left: 1px`, the composition around the row's leading edge visibly reshuffles on hover, which the user reads as "the row moves right / glues".

## Rule violation

Hover state must never change layout/position of any element. Allowed hover deltas: color, background, opacity, border, box-shadow. Forbidden: `top/left/right/bottom`, `transform: translate/scale`, `padding`, `margin`, `width`, `height`, insertion/removal that shifts siblings.

## Fix

- Keep `.editor-rule-order-badge` at its resting position (`top: 50%; transform: translateY(-50%)`) in every state; drop the hover/focus/selected repositioning block.
- Keep the drag handle absolute-overlaid at the same coordinates in every state; only change its opacity/color on hover.
- Badge state changes on hover/selected: opacity + border/background tint only, no geometry.

## Also flagged (deferred to a follow-up issue)

User mentioned Properties panel is "broken" — needs a separate issue with a fresh screenshot before fixing.
