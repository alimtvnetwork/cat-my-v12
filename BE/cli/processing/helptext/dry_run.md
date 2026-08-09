# processing-cli dry-run

Rehearse `evaluate` / `batch` against a frame set WITHOUT persisting
any JSONL result files and WITHOUT emitting `ResultReady` IPC messages.
Use this to iterate on a rule bundle in CI or locally without
polluting `<APP_IPC_ROOT>/results/`.

## Usage

    processing-cli dry-run --bundle <path> --frame <img>
    processing-cli dry-run --bundle <path> --input-dir <dir>
    processing-cli dry-run --bundle <path> --manifest <manifest.json>

Exactly one of `--frame`, `--input-dir`, `--manifest` is required.

## Flags

- `--bundle <path>` Rule bundle JSON (spec/21-app/70).
- `--frame <path>` Single image path.
- `--input-dir <d>` Non-recursive folder of `.png .jpg .jpeg .bmp .tif .tiff`.
- `--manifest <p>` JSON `["path", ...]` or `{"frames":["path", ...]}`.
- `--run-id <id>` Explicit RunSessionId (auto-generated when omitted).

## Output

Universal Envelope with `Data`:

    {
      "RunSessionId": "...",
      "DryRun": true,
      "FrameCount": N,
      "SuccessCount": M,
      "FailureCount": N - M,
      "Results": [ResultRecord, ...],
      "Failures": [{"FramePath","Code","Message","Details"}, ...]
    }

Per-frame `AppError`s (missing frame, evaluator not wired, etc.) are
collected into `Failures[]`. The invocation itself exits 0 unless
enumeration / bundle loading fails.

## Guarantees

- No file writes under `<results-dir>` (no such flag is accepted).
- No IPC produced.
- No DB access.

Anchors: `spec/21-app/75-processing-cli.md` §Subcommands,
`spec/21-app/24-results-json.md` §1 "Write policy".
