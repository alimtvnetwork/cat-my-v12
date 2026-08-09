# Plan 76 Step 23 — single-header invariant recheck

Definition: exactly one app-chrome header (`.app-titlebar`, rendered by `src/components/hmi/Titlebar.tsx`) per route.

Method: Playwright loaded /, /setup, /setup/rules, /setup/functions, /projects, /run, /errors, /ops at 1280x900 and enumerated every `<header>` in the DOM with parent + text.

Result: every route has exactly one `.app-titlebar` chrome header. Additional `<header>` elements found on /, /setup/functions, /projects are legitimate in-content section headers (Getting Started card, Functions banner, Projects hero), not duplicate chrome.

Verdict: PASS. Plan 65 SS-04 / issue 22 invariant holds.
