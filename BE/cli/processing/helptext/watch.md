# `processing-cli watch`

Poll a Worker CLI IPC drop-dir for `FrameReady` messages and evaluate each
one against a rule bundle. Emits `ResultReady` back to the sibling out-dir.

## Usage

    processing-cli watch --bundle <path> [--in-dir processing-in] \
        [--out-dir processing-out] [--ipc-root <dir>] \
        [--results-dir <dir>] [--poll-interval 0.5] \
        [--duration 0] [--max-messages 0] [--idle-exit 0]

## Exit conditions

The loop stops on the first-hit of:

- `--duration <sec>` elapsed (0 = infinite).
- `--max-messages <N>` processed (0 = unlimited).
- `--idle-exit <sec>` of consecutive idle seconds (0 = never).
- `SIGINT` / `SIGTERM`: the in-flight message finishes, then the loop
  returns the aggregate envelope with exit code `Ok`.

## Idempotency

Per `spec/21-app/75-processing-cli.md` acceptance #2 the key is
`(RunId, FrameSeq)`. The persistent `ipc_messages` writer lands at
Plan 90 Step 87. Until then watch enforces the invariant two ways:
each message is acked via `ipc.ack()` (rename to `.msg.ack.json`)
so `ipc.receive()` will not re-yield it, and an in-process set guards
against duplicate `(RunId, Seq)` pairs emitted under fresh ULIDs.

## Errors

Malformed `FrameReady` payloads, missing frame files, and rule bundles
that require the (not-yet-wired) engine surface as per-message entries
in `Failures[]`; the tail loop keeps polling. Argparse and IPC-root
resolution failures abort with `E_CLI_USAGE` / `E_LOG_ROOT_UNWRITABLE`.
