---
Parent: 30-app-ui-rule-editor-revamp
Slug: lighting-controls
Status: locked
Created: 2026-07-14
Updated: 2026-07-14
---

# SS-05 - Lighting controls validation matrix

## Purpose

Lock the lighting drawer controls before `LightingDrawer.tsx` is implemented. This file defines ranges, defaults, validation, logging, and test rows for gain, exposure, illumination, gamma, denoise, darken, and enhance.

## Control table

| Key               | Label        |         Range | Step | Default | Unit    | Commit                       |
| ----------------- | ------------ | ------------: | ---: | ------: | ------- | ---------------------------- |
| `exposureUs`      | Exposure     | 100 to 200000 |  100 |    8000 | us      | slider release or input blur |
| `gainDb`          | Gain         |       0 to 24 |  0.1 |       6 | dB      | slider release or input blur |
| `illuminationPct` | Illumination |      0 to 100 |    1 |      65 | percent | slider release or input blur |
| `gamma`           | Gamma        |      0.2 to 4 | 0.05 |       1 | ratio   | slider release or input blur |
| `denoisePct`      | Denoise      |      0 to 100 |    1 |       0 | percent | slider release or input blur |
| `darkenPct`       | Darken       |      0 to 100 |    1 |       0 | percent | slider release or input blur |
| `enhancePct`      | Enhance      |      0 to 100 |    1 |       0 | percent | slider release or input blur |

Device capability limits may narrow a range but may not widen it. When a device reports a narrower range, the UI renders the intersection and logs no warning. When no camera or lighting capability is available, the drawer disables inputs and emits `E_CAM_LIGHT_UNAVAILABLE`.

## Validation rules

- Do not silently clamp. Out-of-range values are rejected, the last committed value stays active, and the field renders the error state.
- Empty numeric input is allowed only while focused. Blur with an empty value emits `W_UI_LIGHT_OUT_OF_RANGE`.
- Values must align to step after rounding to the smallest step precision. For example, `gainDb=6.15` is invalid because gain steps by `0.1`.
- Slider drag previews are debounced at 150 ms. Release commits exactly one store mutation and one log line.
- `Revert to defaults` applies all seven defaults in one mutation and one history entry.
- `Save as program preset` persists the current validated values with the active program.

## Logging and surfacing

| Code                      | Level | When                                                   | Required keys                                            | UI action                                    |
| ------------------------- | ----- | ------------------------------------------------------ | -------------------------------------------------------- | -------------------------------------------- |
| `I_CAM_LIGHTING_APPLIED`  | info  | Device accepts a validated apply                       | `field`, `value`, `program_id`, `correlation_id`         | Status strip shows sync time                 |
| `W_UI_LIGHT_OUT_OF_RANGE` | warn  | Local validation fails before device call              | `field`, `value`, `min`, `max`, `step`, `correlation_id` | Inline error, no device call                 |
| `E_CAM_LIGHT_UNAVAILABLE` | error | Camera, lighting channel, or capability is unavailable | `program_id`, `field`, `correlation_id`, `error`         | Drawer disabled, retry action visible        |
| `E_UI_LIGHTING_APPLY`     | error | Device rejects a validated write                       | `field`, `value`, `correlation_id`, `error`              | Toast and revert to previous committed value |

Every catch in the lighting path logs once with one of the error codes above and then surfaces the failure. No fallback may hide the error.

## Validation matrix

| ID    | Scenario                                                  | Expected                                                  |
| ----- | --------------------------------------------------------- | --------------------------------------------------------- |
| LC-01 | Set `exposureUs=8000`                                     | Valid, one `I_CAM_LIGHTING_APPLIED`                       |
| LC-02 | Set `exposureUs=99`                                       | Reject, `W_UI_LIGHT_OUT_OF_RANGE`, no device call         |
| LC-03 | Set `gainDb=6.15`                                         | Reject, step mismatch, previous value retained            |
| LC-04 | Set `illuminationPct=101`                                 | Reject, `W_UI_LIGHT_OUT_OF_RANGE`                         |
| LC-05 | Set `gamma=0.2` and `gamma=4`                             | Both valid edge values                                    |
| LC-06 | Clear numeric input and blur                              | Reject, inline error, previous value retained             |
| LC-07 | Drag `denoisePct` 40 ticks and release once               | One mutation, one log line, one history entry             |
| LC-08 | Device rejects `darkenPct=20`                             | `E_UI_LIGHTING_APPLY`, toast, previous value restored     |
| LC-09 | Camera unavailable on drawer open                         | Inputs disabled, `E_CAM_LIGHT_UNAVAILABLE`, retry visible |
| LC-10 | Capability narrows gain to `0 to 12` and user enters `18` | Reject against narrowed max `12`                          |
| LC-11 | Revert to defaults                                        | Seven defaults applied atomically                         |
| LC-12 | Save as program preset                                    | Values persist and reload with active program             |

## Test requirements

- `lighting.test.ts` covers LC-01 through LC-06 and LC-10 through LC-11.
- `lighting.spec.ts` covers LC-07 through LC-09 and LC-12 with Playwright.
- Console assertions must prove the exact code fires for LC-02, LC-08, and LC-09.
