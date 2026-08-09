# 18 - Lighting Setup (scaffold, blocked by Q4)

**Version:** 0.1 (scaffold)
**Owner:** Plan 64 (UI v2), step 13
**Status:** BLOCKED by ambiguity Q4 in `.lovable/ambiguity-questions/01-ui-v2-open-questions.md`

---

## Purpose

Define the LightingSetting record and Setup UI. This file is a scaffold. The user has not yet specified the concrete lighting fields; do NOT finalize the schema or implement the form until Q4 is answered.

## Placeholder object model (proposal, not final)

```
LightingSetting
  id, name,
  scheme ('Ring'|'Bar'|'Dome'|'Coaxial'|'BackLight'|'Custom'),
  intensity_pct,                 -- 0..100
  color_temperature_kelvin,      -- 2000..10000
  strobe ('Off'|'Sync'|'External'),
  strobe_duration_us,
  channels_json,                 -- per-channel intensities for multi-head rigs
  controller_vendor,             -- e.g. Advanced Illumination CCS PD3
  controller_device,             -- serial or COM port
  notes,
  created_at, updated_at
```

## Open questions (Q4)

- What lighting controllers must we support in v1? (Names + models)
- Is `intensity` a single global percentage or per-channel? Both above; pick one.
- Do we need strobe synchronization with the camera trigger, and if so which trigger sources?
- Are lighting profiles standalone Setup entries, or embedded on the CameraSetting record?
- Should Lighting Setup expose a "Test Flash" button that fires without capturing?

## Verification (deferred)

Playwright coverage is deferred until Q4 is answered and the schema is locked.
