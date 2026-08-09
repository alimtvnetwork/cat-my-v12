# processing-cli status

Read-only reporter for the Processing CLI runtime environment. No side
effects: does not create directories, does not touch the DB, does not
emit IPC messages. Use `doctor` for active preflight and
`ipc-bootstrap` (Worker CLI) for drop-dir materialisation.

## Usage

    processing-cli status
    processing-cli status --ipc-root /tmp/ipc --data-root /tmp/data

## Options

- `--log-root PATH` Override `APP_LOG_ROOT` for this probe.
- `--db-root PATH` Override `APP_DB_ROOT` for this probe.
- `--ipc-root PATH` Override `APP_IPC_ROOT` for this probe.
- `--data-root PATH` Override `APP_DATA_ROOT` for this probe.

## Result payload

    Results[0]:
      LogRoot / DbRoot / IpcRoot / DataRoot -> {Path, Exists}
      Drops[]  -> {Name, Path, Exists, PendingCount}   (worker-out,
                                                        processing-in,
                                                        processing-out,
                                                        main-in)
      ResultsDir -> {Path, Exists, SessionCount}

`PendingCount` counts `*.json` payloads currently waiting in the drop
dir. `SessionCount` counts subdirectories of `<data>/results/` (one per
run session).

## Exit codes

Universal envelope, exit 0 on success. Unresolvable host env
(`E_CLI_UNSUPPORTED_HOST`) is the only expected failure path.

Anchor: `spec/21-app/75-processing-cli.md` §Subcommands.
