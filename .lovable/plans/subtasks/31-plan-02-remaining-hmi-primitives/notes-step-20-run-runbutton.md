# Step 20: run.tsx uses RunButton primitive

Root cause: `src/routes/run.tsx:92-98` hand-rolled the Start action bar button with `bg-ca-primary text-ca-bg`, bypassing the locked `RunButton` primitive from SS-03.

Files read: `src/routes/run.tsx`, `src/components/hmi/RunButton.tsx`.

Change: imported `RunButton` from `@/components/hmi` and replaced the Start-branch `<button>` with `<RunButton onClick={start}>Start</RunButton>`. The Stop-branch keeps its `bg-ca-ng` destructive styling (RunButton disables itself when `isRunning`; here we need a live destructive action).

Next 1 Step: Step 21, migrate `src/routes/setup.tsx` tool grid to `ToolTile`.
