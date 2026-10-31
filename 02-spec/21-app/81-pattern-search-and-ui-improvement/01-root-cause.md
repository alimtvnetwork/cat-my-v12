# Root cause

Test This Rule fails in `evaluatePatternRule` when `parseBoxesFromParams`
returns no boxes. The message is `Pattern inspection is not configured:
missing saved pattern boxes`.

## What the canvas did

`usePatternMatchingRule` built `referenceBoxes` from `getAtmelReferenceBoxes`
and kept them in memory. The workpiece canvas painted `generate57SequentialPatternBoxes`
or `markWhiteBoxes` results held in React state. Auto-detect called
`handleDetectElements(false)`, which does not call `onPatternBoxesChange`.
"Set 57 Pattern Boxes" stored a count flag, not coordinates.

## What the tester read

`handleEvaluateSingleRule` called `evaluateWorkpieceRuleReal` on the stored
rule. `parseBoxesFromParams` accepts `constellation`, `referenceBoxes`,
`patternBoxes`, and their JSON twins. Those fields were empty. The
`DEFAULT_24_PATTERN_BOXES` fallback sits on a frozen window at `(380, 190)`
and runs only when the tool code is T102 or T116, or the tool type text
contains "pattern" or "white box". A rule that misses that gate returns
length 0. A rule that hits the gate still searches the frozen window, not
the current ROI.

That is why search worked before the simulation and stopped after it.
Earlier rules stored boxes. The simulation path draws a demo constellation
and leaves `rule.params` empty. ROI commits that keep the full workpiece
outside the ROI did not write the paint back. No commit author named George
is on this vision history. Yasin's ROI commits `71ccbf31` and `846831e9`
are the ones that keep the workpiece uncropped while the paint stays unsaved.

## Why grayscale looked dead

`applyLuminanceFilter` is ITU-R BT.601 `Y = 0.299 R + 0.587 G + 0.114 B`,
then a contrast stretch. It was called from its own test and from
`OffscreenEnhanceBuffer` only. The analyzer's luma loop runs only after
boxes exist. The Greyscale Threshold slider wrote `greyscaleLevel` and did
not call the filter.

## Why the ROI sat in the wrong place

The saved ROI stayed a wide rectangle while the source changed between
sizes such as `1046x360` or `1042x403` and the calibrated `960x540`.
Normalized boxes follow whatever rectangle is current. The first pin now
records the image size it was authored against and rebases only when a
later image differs. The pattern ROI is squared to the shorter side.

## Fix

`pinPatternRule` writes the squared search region and the Atmel 24-box set
into `rule.params.referenceBoxes` before the tester reads the rule. The
canvas persists that pin. `filterPatternRgba` copies the buffer and runs
`applyLuminanceFilter` with `filterType: "binary"`, `lowerLimit` from the
slider, and `upperLimit` 255. The same filter is applied to the canvas
image for a pattern rule.
