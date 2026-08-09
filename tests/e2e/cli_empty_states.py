"""Plan 90 Step 141: Empty-state Playwright acceptance for the CLI namespace.

Root cause the step exists to prevent: `cli.sessions`, `cli.rules`, and
`cli.samples` each ship an illustrated `EmptyState` (icon + title + body
copy, `data-testid="cli-<surface>-empty"`), but nothing in CI proves
they actually mount on a fresh install where the BE returns zero rows.
A regression that swaps the EmptyState for `null`, replaces the
icon with a blank string, or (worse) collapses the surface to the
scoped `CliRouteError` on transport failure would ship with green
`cli_ui_acceptance` because that suite accepts either the success heading
or the error banner. This suite is stricter: it forces BE success with
zero rows and REQUIRES the illustrated empty-state DOM.

Approach (honest, no serverFn payload forgery):
- Spin up a tiny stdlib HTTP server on 127.0.0.1:8787 that answers the
  BE routes the FE server functions hit (`/rules`, `/samples`,
  `/observability/sessions`, `/api/cli/status`) with a well-formed
  Universal Envelope carrying an empty payload. The Vite dev process
  reads `process.env.BE_URL` and defaults to that exact origin, so the
  FE serverFn `fetch` goes straight to this mock. No monkey-patching
  the TSS wire format, no browser-side route interception (server fns
  fetch server-side, invisible to Playwright routing).
- For each surface, navigate, wait for the `cli-<name>-empty` testid,
  screenshot to `assets/ui/`.

Sessions endpoint already has a swallow-and-return-empty fallback
(sessions.functions.ts L100), so the mock is strictly required for
rules + samples; sessions is included for parity + regression fence.
IPC is deliberately out of scope: its empty-state requires a selected
session, which needs a two-endpoint mock coordination that is a
separate step in the plan.
"""
from __future__ import annotations

import asyncio
import json
import socket
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from playwright.async_api import async_playwright

REPO = Path("/dev-server")
OUT = REPO / "assets" / "ui"
OUT.mkdir(parents=True, exist_ok=True)
BASE = "http://localhost:8080"
MOCK_HOST = "127.0.0.1"
MOCK_PORT = 8787


def _envelope(payload: dict) -> bytes:
    # `Errors` is `z.optional()` on the FE side (undefined-only). Emit
    # the field ONLY on failure; sending `null` here would fail Zod
    # parse and surface as `E_FE_TRANSPORT`, defeating the whole test.
    return json.dumps(
        {"Status": {"IsSuccess": True, "Code": "E_OK"}, "Results": [payload]}
    ).encode("utf-8")


ROUTE_PAYLOADS: dict[str, dict] = {
    "/rules": {"items": [], "total": 0, "provider": "MockRuleFacade"},
    "/samples": {"items": [], "total": 0, "provider": "MockCameraFacade"},
    "/observability/sessions": {
        "items": [],
        "total": 0,
        "limit": 50,
        "sort": "StartedAt",
        "dir": "desc",
        "nextCursor": None,
    },
    "/api/cli/status": {
        "worker": {"state": "idle", "lastRunId": None},
        "ipc": {"pending": 0, "lastMsgAt": None},
    },
}


class MockBE(BaseHTTPRequestHandler):
    def log_message(self, *a, **kw):  # silence default access log
        pass

    def do_GET(self):  # noqa: N802
        path = urlparse(self.path).path
        payload = ROUTE_PAYLOADS.get(path)
        if payload is None:
            self.send_response(404)
            self.send_header("content-type", "application/json")
            self.end_headers()
            self.wfile.write(
                json.dumps(
                    {
                        "Status": {"IsSuccess": False, "Code": "E_BE_NOT_FOUND"},
                        "Results": [],
                        "Errors": [{"Code": "E_BE_NOT_FOUND", "Message": path}],
                    }
                ).encode()
            )
            return
        body = _envelope(payload)
        self.send_response(200)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def _port_free(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex((host, port)) != 0


async def _visit_empty(page, path: str, testid: str, shot: str) -> None:
    await page.goto(f"{BASE}{path}", wait_until="domcontentloaded", timeout=15000)
    # Illustrated empty state MUST mount within 8s; failure here means
    # either the EmptyState was removed, the testId was renamed, or the
    # route collapsed to CliRouteError on a supposedly successful call.
    loc = page.locator(f'[data-testid="{testid}"]')
    await loc.wait_for(state="visible", timeout=8000)
    # Assert the icon + title copy rendered (proves the EmptyState
    # component actually painted, not just an empty div with the testid).
    txt = (await loc.inner_text()).strip()
    assert txt, f"{path}: EmptyState {testid} is present but has no text"
    assert await loc.locator("svg").count() >= 1, (
        f"{path}: EmptyState {testid} rendered without an icon"
    )
    await page.screenshot(path=str(OUT / shot))
    print(f"ok: {path} -> {testid} -> assets/ui/{shot}")


async def main() -> None:
    if not _port_free(MOCK_HOST, MOCK_PORT):
        raise SystemExit(
            f"Port {MOCK_PORT} is already bound; refusing to shadow a real BE. "
            "Stop the existing process and re-run."
        )
    server = ThreadingHTTPServer((MOCK_HOST, MOCK_PORT), MockBE)
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    print(f"mock BE up on http://{MOCK_HOST}:{MOCK_PORT}")

    try:
        async with async_playwright() as p:
            b = await getattr(p, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
            ctx = await b.new_context(viewport={"width": 1280, "height": 1800})
            page = await ctx.new_page()

            console_errors: list[str] = []
            page.on(
                "console",
                lambda m: console_errors.append(m.text)
                if m.type == "error"
                else None,
            )

            await _visit_empty(
                page,
                "/cli/sessions",
                "cli-sessions-empty",
                "81-cli-sessions-empty.png",
            )
            await _visit_empty(
                page, "/cli/rules", "cli-rules-empty", "82-cli-rules-empty.png"
            )
            await _visit_empty(
                page,
                "/cli/samples",
                "cli-samples-empty",
                "83-cli-samples-empty.png",
            )

            # Console-error gate: allow the status-widget transport miss
            # (mock does not implement /api/cli/status in a serverFn
            # wrapper the widget likes), but nothing else.
            noisy = [
                m
                for m in console_errors
                if "cli/status" not in m
                and "getCliStatus" not in m
                and "[Supabase]" not in m
            ]
            if noisy:
                raise SystemExit(
                    "unexpected console errors: " + "\n".join(noisy[:10])
                )

            await b.close()
    finally:
        server.shutdown()
        server.server_close()
        print("mock BE down")


if __name__ == "__main__":
    asyncio.run(main())
