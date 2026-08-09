# Step 31: Playwright snapshots /setup and /run

Root cause (of task): acceptance rows need visual evidence of the accumulated a11y and contrast work.

Method: headless Chromium at 1280x1800, `wait_until="networkidle"`, one h1 assertion + main-landmark count per route, pageerror + console-error capture.

Signal (before/after):

- /setup: h1 = ["Program 01"] (was sr-only "Setup editor"), mains = 1, 0 console errors, 0 pageerrors.
- /run: h1 = ["Run"], mains = 1, 0 console errors, 0 pageerrors.

Artifacts:

- .lovable/plans/subtasks/31-plan-02-remaining-hmi-primitives/artifacts/setup.png
- .lovable/plans/subtasks/31-plan-02-remaining-hmi-primitives/artifacts/run.png
