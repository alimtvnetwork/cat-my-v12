"""Plan 90 Step 53 - shared help-text loader and interceptor.

Anchors:
- `spec/13-generic-cli/09-help-system.md` (Markdown per subcommand,
  interceptor pattern, `toolname help` root listing).
- `spec/21-app/76-cli-log-and-ipc.md` §"Stdout contract": normal handler
  paths emit ONE Universal Envelope on stdout. Help output is the
  documented exception (also true for argparse `--help` before this
  change), and PowerShell wrappers key off `$LASTEXITCODE`, not stdout
  shape, when the exit code is 0 and no envelope-shaped line appears.

Behavior:
- `intercept(argv, tool, help_root)` returns an int exit code when help
  was requested (already printed), else `None` to let the dispatcher
  continue. Detection is positional-aware:
    * `<tool> --help | -h`         -> root help
    * `<tool> help [<subcmd>]`     -> root help or subcommand help
    * `<tool> <subcmd> --help|-h`  -> subcommand help
- Root help is generated from the registered `{name: help}` map so
  the listing can never drift from the dispatcher table.
- Subcommand help is loaded from
  `BE/cli/<tool>/helptext/<subcmd>.md`. Missing file is a hard
  `AppError(E_CLI_USAGE)` per spec 09 (help must exist for every
  registered subcommand; CI grep-asserts this in Step 95).

Side-effect free apart from writing to the provided text streams.
"""

from __future__ import annotations

from importlib import resources
from typing import Mapping, TextIO

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

_HELP_FLAGS = frozenset({"--help", "-h"})


def _load_helptext(package: str, subcmd: str) -> str:
    try:
        return resources.files(package).joinpath(f"{subcmd}.md").read_text(encoding="utf-8")
    except (FileNotFoundError, ModuleNotFoundError) as exc:
        raise AppError(
            ErrorCode.E_CLI_USAGE,
            f"no help available for '{subcmd}'",
            details={"Subcommand": subcmd, "Package": package},
        ) from exc


def _render_root(tool: str, description: str, subcommands: Mapping[str, str]) -> str:
    width = max((len(n) for n in subcommands), default=0)
    lines = [
        f"{tool} - {description}".rstrip(" -"),
        "",
        f"Usage: {tool} <subcommand> [flags]",
        "",
        "Subcommands:",
    ]
    for name in sorted(subcommands):
        lines.append(f"  {name.ljust(width)}  {subcommands[name]}")
    lines += [
        "",
        f"Run `{tool} <subcommand> --help` for command-specific help.",
        f"Run `{tool} help <subcommand>` for the same.",
        "",
    ]
    return "\n".join(lines)


def intercept(
    argv: list[str],
    *,
    tool: str,
    description: str,
    subcommands: Mapping[str, str],
    helptext_package: str,
    stdout: TextIO,
) -> int | None:
    """Return an exit code (0) if help was handled, else None.

    Never raises for the ordinary help paths; only raises `AppError`
    when the caller asked for help on an unknown subcommand or one
    without a bundled `.md` file - both of which are dispatcher bugs
    the CI harness must catch.
    """
    if not argv:
        return None

    first = argv[0]

    # Case A: `<tool> --help` / `-h`
    if first in _HELP_FLAGS:
        stdout.write(_render_root(tool, description, subcommands))
        return 0

    # Case B: `<tool> help [<subcmd>]`
    if first == "help":
        if len(argv) == 1:
            stdout.write(_render_root(tool, description, subcommands))
            return 0
        subcmd = argv[1]
        if subcmd not in subcommands:
            raise AppError(
                ErrorCode.E_CLI_USAGE,
                f"unknown subcommand '{subcmd}'",
                details={"Subcommand": subcmd, "Known": sorted(subcommands)},
            )
        stdout.write(_load_helptext(helptext_package, subcmd))
        return 0

    # Case C: `<tool> <subcmd> ... --help`
    if first in subcommands:
        for a in argv[1:]:
            if a in _HELP_FLAGS:
                stdout.write(_load_helptext(helptext_package, first))
                return 0

    return None


__all__ = ["intercept"]
