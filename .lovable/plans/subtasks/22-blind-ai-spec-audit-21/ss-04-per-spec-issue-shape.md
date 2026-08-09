# SS-04 Per-spec issue file shape

Parent: 22-blind-ai-spec-audit-21
Slug: per-spec-issue-shape
Status: pending
Created: 2026-07-14

## File template

```
# <NN>-issue-<slug>.md
Audited: spec/21-app/<file>.md
Version: <current app version pinned in README>
Reviewer: audit-blind-ai-v1
Date: <YYYY-MM-DD>

## Score
Total: XX/100 (Band)
- SelfContained: X/10
- ChecklistPresent: X/10
- EnumsPascalCase: X/10
- ImagesDescribed: X/10
- DbStructureClear: X/10
- ErrorContract: X/10
- FacadeReferenced: X/10
- AcceptanceTestable: X/10
- CodingGuidelineAligned: X/10
- BlindAiReadiness: X/10

## What is missing (blind-AI perspective)
- [ ] <gap 1, referencing the exact section that needs it>
- [ ] <gap 2>
...

## What needs to be fixed
- [ ] <edit 1, imperative, addressable in one PR>
- [ ] <edit 2>
...

## How to improve for a blind AI to follow through
Numbered instructions the blind AI reads to implement the fixed spec, one action per line, no ambiguity.

## PascalCase enum inventory
List of every enum/verdict/tier/status in the source spec, mapped to its PascalCase form. Flag any snake_case or SCREAMING_SNAKE.

## Image descriptions required
For every image reference in the source spec, insert a textual description block explaining what the image shows and why it matters. If none required, write "No images referenced".

## Database structure required
Either paste the tables/columns/indexes/RLS the spec needs, or state "No persistence" explicitly. If persistence exists but is undocumented, raise `E_SPEC_DB_MISSING`.

## Facade cross-reference
If the spec touches any vendor SDK, name the `<Vendor><Domain>SdkFacade` and the `Cat`-prefixed domain objects. If not applicable, write "No SDK boundary".

## Coding-guideline linkage
Cite the sections of coding guidelines / error-management that apply, or raise `E_SPEC_GUIDELINE_MISSING` if the guideline files themselves are absent.

## Acceptance tests
Concrete assertions a test suite could run to prove the fixed spec was implemented.
```

## Verification

Every per-spec issue file in `spec/25-app-audit/` conforms to this template, in order.
