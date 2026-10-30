"""Configuration resolution for bug-report delivery (spec 54).

Resolution order (first hit wins, never hardcoded):

* Email sender: explicit arg > ``CATMY_BUGREPORT_SENDER`` >
  repo-secrets ``11-go-email-reader/01-email-setup.json``
  ``accounts[0].email`` (non-secret field only).
* Email recipient (notifier): explicit arg >
  ``CATMY_BUGREPORT_NOTIFIER`` > repo-secrets
  ``11-go-email-reader/02-default-notifier.json`` ``notifier_email``.
* go-email-reader binary: ``shutil.which`` >
  ``GO_EMAIL_READER_BIN`` > ``~/workspace/go-email-reader/go-email-reader``.
* Supabase settings file: ``CATMY_SUPABASE_CONFIG`` >
  ``~/.config/cat-my-v12/supabase_config.json`` (0600 on save).

Repo-secrets candidates: ``CATMY_REPO_SECRETS_DIR`` >
``~/workspace/repos/repo-secrets`` > ``./repo-secrets``. Only
non-secret fields are ever read from those files (email addresses,
hostnames, ports); no password field exists in them, and this module
never reads, logs, or forwards one.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

_REPO_SECRETS_ENV = "CATMY_REPO_SECRETS_DIR"
_SENDER_ENV = "CATMY_BUGREPORT_SENDER"
_NOTIFIER_ENV = "CATMY_BUGREPORT_NOTIFIER"
_BIN_ENV = "GO_EMAIL_READER_BIN"
_SUPABASE_CONFIG_ENV = "CATMY_SUPABASE_CONFIG"

_EMAIL_SETUP_REL = Path("11-go-email-reader") / "01-email-setup.json"
_NOTIFIER_REL = Path("11-go-email-reader") / "02-default-notifier.json"


def _repo_secrets_dirs() -> list[Path]:
    """Candidate repo-secrets roots in resolution order."""
    candidates = []
    env_dir = os.environ.get(_REPO_SECRETS_ENV)

    if env_dir:
        candidates.append(Path(env_dir))

    candidates.append(Path.home() / "workspace" / "repos" / "repo-secrets")
    candidates.append(Path.cwd() / "repo-secrets")
    return candidates


def _read_json(path: Path) -> dict[str, Any] | None:
    """Parse a JSON file; missing/unparseable files resolve to None."""
    try:
        with open(path, encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, ValueError):
        return None

    return data if isinstance(data, dict) else None


def _repo_secrets_file(relative: Path) -> dict[str, Any] | None:
    """First readable repo-secrets JSON at the given relative path."""
    for root in _repo_secrets_dirs():
        data = _read_json(root / relative)

        if data is not None:
            return data

    return None


def resolve_email_sender(explicit: str | None = None) -> str | None:
    """Default sender address, or None when nothing resolves."""
    if explicit:
        return explicit

    env_sender = os.environ.get(_SENDER_ENV)

    if env_sender:
        return env_sender

    setup = _repo_secrets_file(_EMAIL_SETUP_REL)

    if setup is None:
        return None

    accounts = setup.get("accounts")

    if not isinstance(accounts, list) or not accounts:
        return None

    first = accounts[0]
    email = first.get("email") if isinstance(first, dict) else None
    return email if isinstance(email, str) and email else None


def resolve_notifier(explicit: str | None = None) -> str | None:
    """Default notifier (recipient) address, or None when unresolved."""
    if explicit:
        return explicit

    env_notifier = os.environ.get(_NOTIFIER_ENV)

    if env_notifier:
        return env_notifier

    data = _repo_secrets_file(_NOTIFIER_REL)

    if data is None:
        return None

    email = data.get("notifier_email")
    return email if isinstance(email, str) and email else None


def resolve_go_email_reader_bin(explicit: str | None = None) -> str | None:
    """go-email-reader binary path, or None when it cannot be found."""
    if explicit:
        return explicit

    import shutil

    found = shutil.which("go-email-reader")

    if found:
        return found

    env_bin = os.environ.get(_BIN_ENV)

    if env_bin and Path(env_bin).exists():
        return env_bin

    fallback = Path.home() / "workspace" / "go-email-reader" / "go-email-reader"
    return str(fallback) if fallback.exists() else None


def supabase_config_path() -> Path:
    """Settings-file path for the Supabase endpoint (app-data dir)."""
    env_path = os.environ.get(_SUPABASE_CONFIG_ENV)

    if env_path:
        return Path(env_path)

    return Path.home() / ".config" / "cat-my-v12" / "supabase_config.json"


def load_supabase_config() -> dict[str, Any] | None:
    """Stored Supabase settings, or None when not configured."""
    return _read_json(supabase_config_path())


def save_supabase_config(config: dict[str, Any]) -> Path:
    """Persist Supabase settings with owner-only permissions (0600)."""
    path = supabase_config_path()
    path.parent.mkdir(parents=True, exist_ok=True)

    with open(path, "w", encoding="utf-8") as handle:
        json.dump(config, handle, indent=2)

    os.chmod(path, 0o600)
    return path


def sanitized_supabase_config(config: dict[str, Any] | None) -> dict[str, Any]:
    """Config safe to return over HTTP: never includes the API key."""
    if config is None:
        return {"is_configured": False, "is_enabled": False}

    url = config.get("url")
    return {
        "is_configured": bool(url),
        "is_enabled": bool(config.get("is_enabled", True)) and bool(url),
        "url": url if isinstance(url, str) else None,
        "role": config.get("role"),
        "has_key": bool(config.get("api_key")),
    }


__all__ = [
    "load_supabase_config",
    "resolve_email_sender",
    "resolve_go_email_reader_bin",
    "resolve_notifier",
    "sanitized_supabase_config",
    "save_supabase_config",
    "supabase_config_path",
]
