# Packaging

Status: Draft (Plan 28)
Companion: `./diagrams/08-packaging-pipeline.mmd`

## Pipeline

```
Source
  ├─ Vite build (UI)                → dist/
  ├─ PyInstaller / Nuitka (worker)  → dist/worker/
  └─ Tauri build (shell + bundles)  → target/release/bundle/
```

Steps:

1. `bun run build` → static UI assets under `dist/`.
2. `pyinstaller app/supervisor/boot.py --onedir --name worker` (or Nuitka for
   smaller binaries) → `dist/worker/`.
3. `cargo tauri build` with `tauri.conf.json` pointing `distDir: "../dist"`
   and `externalBin: "../dist/worker/worker"`.
4. Per-OS installer produced by Tauri bundler.

## Artifacts

| OS      | Format                                    | Naming                                        |
| ------- | ----------------------------------------- | --------------------------------------------- |
| Windows | `.msi` (primary), `.exe` (portable)       | `ControlAutomation-{version}-x64.msi`         |
| macOS   | `.dmg` signed + notarized                 | `ControlAutomation-{version}-{arch}.dmg`      |
| Linux   | `.AppImage` (primary), `.deb` (secondary) | `ControlAutomation-{version}-x86_64.AppImage` |

Aligns with `spec/16-generic-release/` naming.

## Reproducibility

- All builds in CI with pinned toolchain versions (Node, Rust, Python).
- `SOURCE_DATE_EPOCH` set from commit timestamp.
- SBOM emitted per bundle (see `21-supply-chain.md`).
- Lockfiles (`bun.lockb`, `Cargo.lock`, `requirements.txt` with hashes) committed.

## Local developer build

- `bun run dev:shell` — starts Vite dev server + Python worker + Tauri in dev mode.
- Renderer hot-reloads; worker restart requires `bun run dev:worker:restart`.

## Non-goals

- Multi-arch fat binaries. Publish separate x86_64 and arm64 artifacts.
