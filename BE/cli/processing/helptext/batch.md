# processing-cli batch

Fan `evaluate` across many frames in a single invocation. Produces one
Universal Envelope on stdout whose payload lists both successful
`ResultRecord`s and per-frame failures.

## Arguments

- `--bundle <path>` (required): rule bundle JSON per `spec/21-app/70`.
- `--input-dir <dir>`: non-recursive folder of image frames (`.png .jpg
.jpeg .bmp .tif .tiff`), sorted by filename.
- `--manifest <path>`: JSON file whose top-level is a `[string, ...]`
  array or `{"frames": [string, ...]}`. Order is preserved.
- Exactly one of `--input-dir` / `--manifest` is required.
- `--run-id <id>` (optional): explicit `RunSessionId`; auto-generated
  when omitted. All frames in this batch share the same id.
- `--results-dir <dir>` (optional): append every `ResultRecord` to
  `<results-dir>/<RunSessionId>.jsonl` with `fsync` per
  `spec/21-app/24-results-json.md` §1 (single writer, serialized).
- `--max-workers <int>` (default 1, cap 16): bounded thread fan-out.
  See `spec/21-app/17-parallelism-guarantees.md` §7 for why 16 is the
  ceiling.

## Output payload

```
{
  "RunSessionId": "...",
  "FrameCount": N,
  "SuccessCount": M,
  "FailureCount": N - M,
  "Results":  [ResultRecord, ...],
  "Failures": [{"FramePath", "Code", "Message", "Details"}, ...]
}
```

Per-frame failures are collected, not raised, per
`spec/13-generic-cli/18-batch-execution.md` "continue on failure". The
batch itself fails hard only on argparse errors (`E_CLI_USAGE`), a
missing input dir / manifest (`E_BE_NOT_FOUND`), or a manifest that is
not decodable JSON (`E_CLI_USAGE`).

## Anchors

`spec/21-app/75-processing-cli.md` §Subcommands, §Outputs;
`spec/21-app/17-parallelism-guarantees.md` §3, §5;
`spec/13-generic-cli/18-batch-execution.md`;
`spec/21-app/24-results-json.md` §1.
