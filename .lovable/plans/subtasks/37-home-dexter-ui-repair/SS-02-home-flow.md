Slug: home-flow
Parent: 37-home-dexter-ui-repair
Status: pending
Created: 2026-07-16

# Home-first workflow information architecture

## Scope

Restore `/` as the launcher and make project work flow from home into project-specific setup, settings, rules, images, testing, and run.

## Required structure

- `/` shows four primary entries: Projects, Setup, Trial run, AI testing.
- Projects opens project creation and existing project selection.
- Inside a project, the user can reach setup recipe, settings, rule-based setup, image upload, test, and run surfaces.
- Home is not a jobs table, queue, task pane, or marketing page.
- Every route has a Home affordance in the top chrome.

## Verification

- User can navigate from `/` to project flow and back to `/` without browser back.
- No page makes Home available only through hidden menu nesting.
- Route labels match the user vocabulary: project, setup, settings, rules, images, test, run.
