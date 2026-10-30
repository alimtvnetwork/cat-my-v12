"""Bug-report email sender via go-email-reader (spec 54).

The go-email-reader pattern (repo-secrets 11-go-email-reader/ flow
doc): accounts live in go-email-reader's own SQLite store with
RSA-OAEP-SHA256-encrypted passwords; this package NEVER reads, holds,
or forwards a password. Sending is delegated to the go-email-reader
binary (`send --from --to --subject --body [--attach ...]`), which
owns the credentials. Sender/recipient defaults resolve from
``BE.bug_reports.config`` (repo-secrets non-secret fields + env),
never hardcoded.

When the binary cannot be found, sending fails with a setup message
naming the install path — never a silent skip, never invented
credentials.
"""

from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Any

from BE.bug_reports import config as bug_config

_SEND_TIMEOUT_S = 60


class EmailSendError(Exception):
    """Email delivery failed (binary missing, bad config, or SMTP error)."""


def _run(args: list[str], timeout: int = _SEND_TIMEOUT_S) -> subprocess.CompletedProcess[str]:
    """Run go-email-reader; surface stderr (truncated, never secrets)."""
    result = subprocess.run(args, capture_output=True, text=True, timeout=timeout)

    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "unknown error").strip()
        raise EmailSendError(f"go-email-reader failed: {detail[:500]}")

    return result


def send_bug_report_email(
    subject: str,
    body: str,
    *,
    sender: str | None = None,
    recipient: str | None = None,
    attachments: list[Path] | None = None,
) -> dict[str, Any]:
    """Send one bug-report email; returns the delivery record."""
    binary = bug_config.resolve_go_email_reader_bin()

    if binary is None:
        raise EmailSendError(
            "go-email-reader binary not found: install it and add an "
            "account (go-email-reader add), or set GO_EMAIL_READER_BIN."
        )

    resolved_sender = bug_config.resolve_email_sender(sender)

    if resolved_sender is None:
        raise EmailSendError(
            "No sender address resolves: pass --from, set "
            "CATMY_BUGREPORT_SENDER, or add an account to go-email-reader."
        )

    resolved_recipient = bug_config.resolve_notifier(recipient)

    if resolved_recipient is None:
        raise EmailSendError(
            "No recipient resolves: pass --to, set "
            "CATMY_BUGREPORT_NOTIFIER, or set the notifier "
            "(go-email-reader notifier set --email <address>)."
        )

    args = [
        binary,
        "send",
        "--from",
        resolved_sender,
        "--to",
        resolved_recipient,
        "--subject",
        subject,
        "--body",
        body,
    ]

    for attachment in attachments or []:
        args.extend(["--attach", str(attachment)])

    _run(args)
    return {
        "is_sent": True,
        "sender": resolved_sender,
        "recipient": resolved_recipient,
        "attachment_count": len(attachments or []),
    }


__all__ = ["EmailSendError", "send_bug_report_email"]
