# Step 25: SS-10 contrast + dark-theme verification

Root cause: `src/routes/run.tsx:87,146` painted Stop buttons as `bg-ca-ng text-ca-chrome-ink`, computed WCAG ratio 3.46 (FAIL AA for body text). Rest of the CA palette passes AA on its intended pairings.

Files read: `src/styles.css:171-187` (CA token values).

Computed WCAG ratios (OKLCH -> linear sRGB -> relative luminance):

| pair                        | ratio              | AA body       | note                        |
| --------------------------- | ------------------ | ------------- | --------------------------- |
| ink on panel                | 15.77              | pass          |                             |
| ink-muted on panel          | 5.70               | pass          |                             |
| ink on bg                   | 17.28              | pass          |                             |
| ink-muted on bg             | 6.24               | pass          |                             |
| chrome-ink on chrome        | 17.09              | pass          |                             |
| white on select             | 8.98               | pass          | ToolTile selected           |
| bg on primary               | 6.77               | pass          | RunButton (uses text-ca-bg) |
| bg on ng                    | 5.61               | pass          | Stop button after fix       |
| bg on ok                    | 9.02               | pass          |                             |
| bg on warn                  | 10.19              | pass          |                             |
| ok/ng/warn on panel         | 8.23 / 5.12 / 9.30 | pass          | status text                 |
| chrome-ink on ng (OLD Stop) | 3.46               | **FAIL**      | replaced with bg            |
| white on primary            | 2.87               | fail (unused) | do not pair                 |
| ink on ok/warn              | ~1.8               | fail (unused) | do not pair                 |

Change: replaced `text-ca-chrome-ink` with `text-ca-bg` on both Stop buttons in `src/routes/run.tsx` (line 87 action-bar Stop, line 146 confirm-dialog Stop). Ratio moves from 3.46 to 5.61 (AA pass).

Guardrails documented for future work: never pair `text-white`/`text-ca-chrome-ink` with `bg-ca-primary` or `bg-ca-ng`; always use `text-ca-bg`. Never place `text-ca-ink` on `ok`/`warn` fills; use `text-ca-bg` or place ok/warn as text on `ca-panel` instead.

Only one theme is shipped (dark slate on `:root`), so dark-theme parity is trivially satisfied. No separate `.dark` overrides for the `--ca-*` tokens exist and none are required.

Next 1 Step: Step 26, forbidden-string sweep (search codebase for `bg-white`, `text-black`, hex literals in components).
