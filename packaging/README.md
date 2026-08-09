# packaging/

Release-time build recipes for the CLI binaries and installer wrappers.
Everything in this tree runs on CI runners or a developer machine, never
inside the app runtime.

Owning specs:

- `spec/21-app/77-cli-powershell-and-release.md` (release artefacts,
  SHA256SUMS, install one-liners).
- `spec/16-generic-release/05-release-assets.md` (per-platform asset
  matrix and naming).
- `spec/12-cicd-pipeline-workflows/` (build-matrix + verify-install).

Root cause guarded (one sentence): without a single documented build path
per binary, operators end up hand-crafting PyInstaller invocations that
drift from CI, producing binaries whose SHA256 does not match the
published `SHA256SUMS.txt` and silently failing checksum verification in
`install.ps1` / `install.sh`.

## Layout

```
packaging/
  pyinstaller/       # Onefile PyInstaller specs, one per shipped binary.
    worker.spec        (Step 85)   -> dist/worker-cli(.exe)
    processing.spec    (Step 86)   -> dist/processing-cli(.exe)
    db-bootstrap.spec  (Step 117)  -> dist/db-bootstrap(.exe)
    retention-run.spec             -> dist/retention-run(.exe)
  installers/        # Public install one-liners (fetched via irm/curl).
    install.ps1        Windows: PowerShell 5.1+/7+.
    install.sh         Linux/macOS: POSIX sh.
  systemd/           # Linux service unit templates.
  windows/           # Windows Task Scheduler XML templates.
```

## Local build commands

Run from the repo root with the project venv activated (`pip install
pyinstaller` inside `.venv` first; PyInstaller is a build-time dep, not
shipped at runtime).

```bash
# Worker CLI
pyinstaller packaging/pyinstaller/worker.spec --clean --noconfirm
# -> dist/worker-cli(.exe)

# Processing CLI
pyinstaller packaging/pyinstaller/processing.spec --clean --noconfirm
# -> dist/processing-cli(.exe)

# DB bootstrap (invoked by installers on first run)
pyinstaller packaging/pyinstaller/db-bootstrap.spec --clean --noconfirm
# -> dist/db-bootstrap(.exe)

# Retention runner (scheduled task target)
pyinstaller packaging/pyinstaller/retention-run.spec --clean --noconfirm
# -> dist/retention-run(.exe)
```

All four specs share the same invariants (see the header comment in each
`.spec` for the long-form rationale):

1. `onefile=True` and `console=True` so stdout carries a Universal
   Envelope JSON payload readable by the PowerShell wrappers under
   `scripts/ps/`.
2. `upx=False` so bytes are deterministic across build hosts and the
   published `SHA256SUMS.txt` stays reproducible.
3. `strip=False` (Windows PE stripping is unsupported).
4. Test packages (`pytest`, `_pytest`, `pytest_asyncio`, `hypothesis`,
   `BE.tests`, `tests`) are excluded from `Analysis` so pytest fixtures
   never leak into shipped binaries.
5. Non-code data bundled per binary:
   - Worker + Processing: `sdk/` (vendor manual + asset descriptors,
     spec 73), the CLI's own `helptext/` tree (importlib.resources
     fixtures), and `BE/db/migrations/{root,task}/`.
   - db-bootstrap + retention-run: only `BE/db/migrations/`.

## Verification

After building, smoke-test each binary against the Universal Envelope
contract before uploading to a release:

```bash
./dist/worker-cli version | jq '.Status.IsSuccess'      # -> true
./dist/worker-cli doctor  | jq '.Status.Code'           # -> 200
./dist/processing-cli version | jq '.Status.IsSuccess'  # -> true
./dist/processing-cli doctor  | jq '.Status.Code'       # -> 200
```

Automated coverage lands in `packaging/tests/test_built_binary.sh`
(Step 88); until then, the commands above are the manual gate.

## Determinism checklist

Before signing a release:

1. Build on the CI runner OS/arch that matches the target artefact
   (Windows `.exe` on `windows-latest`, Linux ELF on `ubuntu-latest`).
2. `sha256sum dist/*` output must match the `SHA256SUMS.txt` job output
   character-for-character. A UPX-on rebuild or a differing Python
   patch version will drift the hash. Regenerate on drift; never
   hand-edit `SHA256SUMS.txt`.
3. Confirm none of the excluded packages appear in
   `dist/<name>.dist-info/` (only present with `--onedir` builds, but
   worth a spot-check when converting).

## Do NOT

- Do NOT enable UPX; determinism is more valuable than a smaller binary.
- Do NOT bundle secrets, `.env` files, or anything under `.lovable/`.
- Do NOT ship an `--onedir` variant; the release surface is onefile only
  per spec 77 §Release artefacts.
- Do NOT invoke PyInstaller from application code paths; it is a
  build-time tool exclusively.
