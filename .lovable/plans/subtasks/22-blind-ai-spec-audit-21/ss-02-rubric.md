# SS-02 Blind-AI Audit Rubric

Parent: 22-blind-ai-spec-audit-21
Slug: rubric
Status: pending
Created: 2026-07-14

## Purpose

Define the scoring rubric used by every per-spec issue file so scores are comparable across the audit.

## Categories (each 0-10, integer)

1. **SelfContained** — a blind AI with only this file plus explicit cross-refs can implement.
2. **ChecklistPresent** — file ends with an "Implementation Checklist" section, every requirement ticked as a bullet.
3. **EnumsPascalCase** — every enum, verdict, tier, status, kind, mode in prose is PascalCase.
4. **ImagesDescribed** — every image reference has a textual description explaining regions, colors, meaning.
5. **DbStructureClear** — file names its persistence surface (tables, columns, indexes, GRANT/RLS) or states "no persistence" explicitly.
6. **ErrorContract** — every failure path names an `E_*` code, maps to a taxonomy in spec 40, and states log level.
7. **FacadeReferenced** — if the file touches an external SDK, it names the `<Vendor><Domain>SdkFacade` and `Cat`-prefixed objects per spec 52.
8. **AcceptanceTestable** — the file lists concrete acceptance criteria that a test can assert.
9. **CodingGuidelineAligned** — file cross-references coding guidelines and error-management rules where relevant. If those guideline files do not yet exist, flag `E_SPEC_GUIDELINE_MISSING`.
10. **BlindAiReadiness** — final subjective 0-10: could a weak model, given ONLY `spec/`, implement this?

## Total

Max 100. Bands:

- 90-100 `BlindAiReady`
- 75-89 `BlindAiCloseGaps`
- 60-74 `BlindAiRisk`
- <60 `BlindAiBlocker`

## Output shape per finding

```
Score: XX/100 (Band)
Category breakdown: SelfContained=X, ChecklistPresent=X, ...
Missing: <bulleted list of concrete gaps>
Fix: <bulleted list of concrete edits>
BlindAiPathway: <what the blind AI does step-by-step if the fix lands>
```

## Verification

`spec/25-app-audit/01-rubric.md` mirrors this content verbatim so the blind AI does not need this plan file to grade itself later.
