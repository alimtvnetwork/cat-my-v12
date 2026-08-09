# Pending Tasks Inventory

## Coding Guideline Fixes

- [x] Create V2 guidelines for Newlines and Enums (`spec/02-coding-guidelines-V2`)
- [x] Phase 1: Fix all negative `useEffect` statements (30+ files fixed)
- [ ] Phase 2: Resolve nested ternaries (66 files remaining). These involve complex UI logic and should be tackled incrementally in smaller chunks in future loops.
- [ ] Phase 3: Address magic strings across the codebase.

## Reminders for Next AI

- The `src/lib/enums/` types have `Type` or `Category` suffixes and use namespace validation (e.g. `RunStatusType.isIdle()`). Do not use `===`.
- Always verify routes by running `npx @tanstack/router-cli generate` after type changes in `validateSearch`.
- Keep the `task.md` up-to-date with your looping plan.
