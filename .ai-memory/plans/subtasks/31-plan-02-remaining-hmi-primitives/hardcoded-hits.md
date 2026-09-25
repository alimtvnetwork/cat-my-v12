# Hardcoded hits ledger: plan 31

Scope: `src/` raw color literals from `rg -n "#[0-9A-Fa-f]{3,8}|rgba?\(|hsla?\(" src`.

Verification captured before this ledger:

- `python3 linter-scripts/check-forbidden-strings.py`: PASS, zero forbidden-string findings.
- `python3 linter-scripts/forbidden-strings-summary.py`: clean, zero findings.
- Raw color sweep: 4 lines, all in `src/lib/error-page.ts`.

## Remaining raw color literals

| File                    | Line | Literal(s)                | Context                                                                                                                                                                             | Decision                                                                                                    |
| ----------------------- | ---: | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `src/lib/error-page.ts` |    9 | `#fafafa`, `#111`         | Inline CSS inside `renderErrorPage()` fallback HTML shell body. This page is returned as a standalone string before the React app, Tailwind theme, and HMI token CSS are available. | Allow as bootstrap exception. Not part of themed app UI.                                                    |
| `src/lib/error-page.ts` |   12 | `#4b5563`                 | Inline paragraph color in the standalone fallback page.                                                                                                                             | Allow as bootstrap exception. Replacing with tokens would not work reliably because app CSS is unavailable. |
| `src/lib/error-page.ts` |   15 | `#111`, `#fff`            | Inline primary button colors in the standalone fallback page.                                                                                                                       | Allow as bootstrap exception. Keeps recovery actions readable when the app shell failed.                    |
| `src/lib/error-page.ts` |   16 | `#fff`, `#111`, `#d1d5db` | Inline secondary action and border colors in the standalone fallback page.                                                                                                          | Allow as bootstrap exception. Keeps fallback navigation usable without external CSS.                        |

## Result

No raw color literals remain in themed React app surfaces under `src/components` or `src/routes`. The only remaining `src/` hits are the standalone fatal-error fallback in `src/lib/error-page.ts:9,12,15,16`, where design tokens are not available by construction.
