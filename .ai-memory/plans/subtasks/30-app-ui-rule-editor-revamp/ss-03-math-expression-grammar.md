---
Parent: 30-app-ui-rule-editor-revamp
Slug: math-expression-grammar
Status: locked
Created: 2026-07-14
Updated: 2026-07-14
---

# SS-03 - Math expression grammar and numeric vectors

## Purpose

Lock the pure math surface for the editor before implementation starts. This file covers the Math rule expression evaluator used by `05-rule-controller.md` and the deterministic numeric vectors used by `03-canvas.md`, `coords.test.ts`, and `hit-test.test.ts`.

## Non-negotiables

- No `eval`, `Function`, dynamic import, I/O, DOM reads, store reads, logging, Date, or random inside the parser, evaluator, coordinate helpers, or hit-test helpers.
- Every numeric result must be finite. `NaN`, `Infinity`, and `-Infinity` are invalid.
- Parsing and evaluation return typed results. UI callers log `W_UI_RULE_INVALID` with `field=expression` and a reason from this file.
- Geometry helpers keep full precision in state. Rendering may round to 3 decimals only at the SVG attribute boundary.

## Expression grammar

```text
Expression  = Comparison
Comparison  = Add (CompOp Add)
CompOp      = "<" | "<=" | ">" | ">=" | "==" | "!="
Add         = Mul (("+" | "-") Mul)*
Mul         = Unary (("*" | "/" | "%") Unary)*
Unary       = ("+" | "-")? Primary
Primary     = Number | Reference | Call | "(" Add ")"
Reference   = Identifier ".value"
Call        = ("min" | "max") "(" Add "," Add ")" | "abs" "(" Add ")"
Identifier  = /[A-Za-z_][A-Za-z0-9_]*/
Number      = /[0-9]+(\.[0-9]+)?/
```

Top-level Math rule expressions must include exactly one comparison. A numeric-only expression is invalid because the rule would not produce a pass or fail result.

## Operator semantics

| Item         | Rule                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------- |
| `+ - * / %`  | Standard left-associative arithmetic after precedence.                                    |
| `/`          | Division by zero returns `math_div_zero`.                                                 |
| `%`          | Remainder by zero returns `math_div_zero`.                                                |
| `== !=`      | Numeric equality only. No string comparison.                                              |
| `min`, `max` | Exactly 2 numeric args.                                                                   |
| `abs`        | Exactly 1 numeric arg.                                                                    |
| References   | Resolve against sibling rule names by exact `name`, using their current numeric `.value`. |

## Forbidden constructs

Reject these with `math_parse` before evaluation:

- Assignment: `=`, `+=`, `-=`, `*=`, `/=`.
- Boolean chains: `&&`, `||`, `!`.
- Strings, arrays, objects, template literals, semicolons, brackets, braces.
- Function definitions, property access other than `.value`, optional chaining.
- Scientific notation. Use decimal literals only.

## Expression vector set

All vectors use this sibling value map unless a row overrides it:

```json
{ "ROI_1": 79, "ROI_2": 119, "COUNT": 3, "LIMIT": 5 }
```

| ID        | Expression                              | Expected                           |
| --------- | --------------------------------------- | ---------------------------------- |
| MATH-V-01 | `(ROI_1.value + ROI_2.value) / 2 < 100` | valid, pass `true`, value `99`     |
| MATH-V-02 | `ROI_1.value + ROI_2.value * 2 <= 320`  | valid, pass `true`, value `317`    |
| MATH-V-03 | `max(ROI_1.value, ROI_2.value) == 119`  | valid, pass `true`, value `119`    |
| MATH-V-04 | `abs(ROI_1.value - ROI_2.value) < 50`   | valid, pass `true`, value `40`     |
| MATH-V-05 | `COUNT.value % 2 != 0`                  | valid, pass `true`, value `1`      |
| MATH-V-06 | `MISSING.value < 10`                    | invalid, reason `math_ref_missing` |
| MATH-V-07 | `ROI_1.value / 0 < 1`                   | invalid, reason `math_div_zero`    |
| MATH-V-08 | `ROI_1.value + 2`                       | invalid, reason `math_parse`       |
| MATH-V-09 | `ROI_1.value = 2`                       | invalid, reason `math_parse`       |
| MATH-V-10 | `eval(ROI_1.value) < 2`                 | invalid, reason `math_parse`       |

## Geometry numeric contract

`CanvasView` is interpreted as `{ zoom, panX, panY }`, where pan values are image-space pixels at the canvas origin.

```text
canvasX = (imageX - panX) * zoom
canvasY = (imageY - panY) * zoom
imageX = canvasX / zoom + panX
imageY = canvasY / zoom + panY
```

Snap tolerance converts from canvas pixels to image pixels by `toleranceImagePx = toleranceCanvasPx / zoom`.

## Geometry vector set

Shared view for GEO-V-01 through GEO-V-06: `{ "zoom": 2, "panX": 50, "panY": 25 }`.

| ID       | Input                                                                           | Expected                              |
| -------- | ------------------------------------------------------------------------------- | ------------------------------------- |
| GEO-V-01 | image point `{x:100,y:50}`                                                      | canvas point `{x:100,y:50}`           |
| GEO-V-02 | canvas point `{x:0,y:0}`                                                        | image point `{x:50,y:25}`             |
| GEO-V-03 | canvas point `{x:102,y:53}`, vertex image `{x:100,y:50}`, tolerance 4 canvas px | snap `true`, target vertex            |
| GEO-V-04 | canvas point `{x:103,y:54}`, vertex image `{x:100,y:50}`, tolerance 4 canvas px | snap `false`                          |
| GEO-V-05 | rect `{x:60,y:40,width:20,height:10}`                                           | bbox `{x:60,y:40,width:20,height:10}` |
| GEO-V-06 | rect `{x:10,y:10,width:0,height:5}`                                             | invalid `Degenerate`                  |
| GEO-V-07 | circle `{cx:30,cy:30,r:3}`, point `{x:36,y:30}`, zoom 1, tolerance 4 canvas px  | body hit `true`                       |
| GEO-V-08 | polygon triangle `[(0,0),(10,0),(0,10)]`, point `{x:8,y:8}`                     | body hit `false`                      |

## Test requirements

- `math-evaluator.test.ts` must include all MATH-V rows.
- `coords.test.ts` must include GEO-V-01 through GEO-V-04.
- `hit-test.test.ts` must include GEO-V-05 through GEO-V-08.
- Any implementation that changes a vector must update this file and `98-changelog.md` in the same change.
