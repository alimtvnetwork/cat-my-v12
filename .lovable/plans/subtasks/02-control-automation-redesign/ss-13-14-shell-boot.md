# SS-13-14 HmiShell + Boot

- Created `src/components/hmi/HmiShell.tsx` and re-exported from barrel.
- Rewrote `src/routes/index.tsx` to a Boot screen using `HmiShell` + `Viewport`; removed placeholder marker.
- Added route-specific head meta (title/description).
- Build: `bun run build:dev` exit 0.
