"""Plain PostgREST client for Supabase (spec 54, AGM pattern).

No SDK: stdlib ``urllib`` only, mirroring AGM's
``supabase_client/client.rs`` — ``apikey`` + ``Authorization: Bearer``
headers, 15s timeout, URL normalization (redundant ``/rest/v1`` paths
and trailing slashes stripped), transport errors classified into
user-facing text (timeout/connect hints at a paused free-tier project,
never blames the API key), and a circuit breaker that opens after 3
consecutive failures for 60s.
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

_DEFAULT_TIMEOUT_S = 15.0
_BREAKER_THRESHOLD = 3
_BREAKER_COOLDOWN_S = 60.0


class SupabaseError(Exception):
    """User-facing Supabase failure with a classified message."""

    def __init__(self, message: str, *, is_retryable: bool = False) -> None:
        super().__init__(message)
        self.is_retryable = is_retryable


class CircuitBreaker:
    """Small breaker: opens after N consecutive failures for a while."""

    def __init__(self, threshold: int = _BREAKER_THRESHOLD) -> None:
        self._threshold = threshold
        self._failures = 0
        self._open_until = 0.0

    def is_open(self) -> bool:
        """True while the breaker is open (calls must be skipped)."""
        return time.monotonic() < self._open_until

    def record_success(self) -> None:
        """Reset the failure count after a good call."""
        self._failures = 0

    def record_failure(self) -> None:
        """Count a failure; open the breaker at the threshold."""
        self._failures += 1

        if self._failures >= self._threshold:
            self._open_until = time.monotonic() + _BREAKER_COOLDOWN_S


def normalize_url(url: str) -> str:
    """Strip trailing slashes and redundant /rest/v1 segments."""
    cleaned = url.strip().rstrip("/")

    while cleaned.endswith("/rest/v1"):
        cleaned = cleaned[: -len("/rest/v1")].rstrip("/")

    return cleaned


def classify_error(error: Exception) -> SupabaseError:
    """Map a transport/HTTP failure to a user-facing message."""
    if isinstance(error, urllib.error.HTTPError):
        if error.code in (401, 403):
            return SupabaseError("Supabase rejected the request: check the API key and role.")
        if error.code == 404:
            return SupabaseError(
                "Supabase table not found: run BE/bug_reports/schema.sql "
                "in the Supabase dashboard SQL editor, then verify tables."
            )
        return SupabaseError(f"Supabase returned HTTP {error.code}.", is_retryable=error.code >= 500)

    reason = getattr(error, "reason", error)

    if isinstance(error, (TimeoutError, urllib.error.URLError)):
        return SupabaseError(
            "Supabase is unreachable (timeout or connection failure): "
            "the project may be paused (free-tier) or the URL may be wrong.",
            is_retryable=True,
        )

    return SupabaseError(f"Supabase request failed: {reason}.", is_retryable=True)


class SupabaseClient:
    """Minimal PostgREST client: select / insert / upsert + RPC."""

    def __init__(self, url: str, api_key: str, timeout: float = _DEFAULT_TIMEOUT_S) -> None:
        self._base = normalize_url(url)
        self._api_key = api_key
        self._timeout = timeout
        self.breaker = CircuitBreaker()

    def _headers(self) -> dict[str, str]:
        """Auth headers shared by every request (AGM header scheme)."""
        return {
            "apikey": self._api_key,
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

    def _request(
        self, method: str, path: str, body: Any = None, query: str = ""
    ) -> Any:
        """One PostgREST call with breaker + classified errors."""
        if self.breaker.is_open():
            raise SupabaseError("Supabase calls are paused (circuit breaker open after repeated failures).")

        url = f"{self._base}/rest/v1/{path}{query}"
        data = json.dumps(body).encode("utf-8") if body is not None else None
        request = urllib.request.Request(url, data=data, headers=self._headers(), method=method)

        try:
            with urllib.request.urlopen(request, timeout=self._timeout) as response:
                payload = response.read().decode("utf-8")
        except Exception as error:  # noqa: BLE001 - classified below
            self.breaker.record_failure()
            raise classify_error(error) from error

        self.breaker.record_success()

        if not payload:
            return None

        try:
            return json.loads(payload)
        except ValueError:
            return payload

    def select(self, table: str, query: str = "") -> list[dict[str, Any]]:
        """GET rows; query is the raw PostgREST query string (with ?)."""
        result = self._request("GET", table, query=query)
        return result if isinstance(result, list) else []

    def insert(self, table: str, payload: dict[str, Any]) -> dict[str, Any]:
        """POST one row; returns the inserted row representation."""
        result = self._request(
            "POST", table, body=payload, query="?select=*"
        )
        rows = result if isinstance(result, list) else [result]
        return rows[0] if rows and isinstance(rows[0], dict) else {}

    def upsert(
        self, table: str, payload: dict[str, Any], on_conflict: str
    ) -> dict[str, Any]:
        """POST with on-conflict merge (PostgREST resolution=merge-duplicates)."""
        url = f"{self._base}/rest/v1/{table}?on_conflict={on_conflict}&select=*"
        data = json.dumps(payload).encode("utf-8")
        headers = dict(self._headers())
        headers["Prefer"] = "resolution=merge-duplicates,return=representation"
        request = urllib.request.Request(url, data=data, headers=headers, method="POST")

        try:
            with urllib.request.urlopen(request, timeout=self._timeout) as response:
                payload_text = response.read().decode("utf-8")
        except Exception as error:  # noqa: BLE001 - classified below
            self.breaker.record_failure()
            raise classify_error(error) from error

        self.breaker.record_success()
        rows = json.loads(payload_text) if payload_text else []
        return rows[0] if rows and isinstance(rows[0], dict) else {}

    def test_endpoint(self) -> dict[str, Any]:
        """Connectivity probe: select one row from bug_reports."""
        rows = self.select("bug_reports", "?select=id&limit=1")
        return {"is_reachable": True, "row_count_sample": len(rows)}

    def verify_tables(self) -> dict[str, Any]:
        """Check both bug tables exist (missing table -> clear hint)."""
        found: dict[str, bool] = {}

        for table in ("bug_reports", "bug_attachments"):
            try:
                self.select(table, "?select=id&limit=1")
                found[table] = True
            except SupabaseError:
                found[table] = False

        return {"tables": found, "is_verified": all(found.values())}


def client_from_config(config: dict[str, Any] | None) -> SupabaseClient | None:
    """Build a client from stored settings, or None when unconfigured."""
    if config is None:
        return None

    url = config.get("url")
    api_key = config.get("api_key")

    if not isinstance(url, str) or not url or not isinstance(api_key, str) or not api_key:
        return None

    if not config.get("is_enabled", True):
        return None

    return SupabaseClient(url, api_key)


__all__ = [
    "CircuitBreaker",
    "SupabaseClient",
    "SupabaseError",
    "classify_error",
    "client_from_config",
    "normalize_url",
]
