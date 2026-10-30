#!/usr/bin/env python3
"""CLI-driven end-to-end suite for spec 54 (vision system + error management).

Runs the backend + processing-cli against a fresh temporary SplitDB root and
asserts behaviour end to end. No live browser UI runs in this environment, so
every case is labelled honestly:

  live   - exercised against the running FastAPI backend over HTTP.
  cli    - exercised through the `processing-cli` binary.
  static - source-level assertion (component/route code that only a live
           browser UI on the user's machine can click through).

Static cases are NOT live-UI passes: they prove the wiring exists in the
shipped source. The morning report must list the live-UI verifications that
still need the user's machine (see spec 54 section 23).

Usage:
    ~/.venvs/catmy/bin/python tests/e2e-spec54/run_e2e_spec54.py [--keep-tmp]

Exit code 0 iff every case passes. The shutdown group (K) always runs last:
it POSTs /shutdown and verifies the backend process exits.
"""

from __future__ import annotations

import ast
import csv
import io
import json
import os
import re
import sqlite3
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
VENV_BIN = Path.home() / ".venvs" / "catmy" / "bin"
VPY = VENV_BIN / "python" if (VENV_BIN / "python").exists() else Path(sys.executable)
CLI = VENV_BIN / "processing-cli"
HAS_CLI_BIN = CLI.exists()
PORT = 18787
BASE = f"http://127.0.0.1:{PORT}"

PASS = "PASS"
FAIL = "FAIL"

RESULTS: list[tuple[str, str, str, str]] = []  # (group, case_id, kind, detail)


def record(group: str, case_id: str, kind: str, ok: bool, detail: str = "") -> None:
    RESULTS.append((group, case_id, kind, f"{PASS if ok else FAIL}: {detail}"))
    if not ok:
        print(f"  [{FAIL}] {group}/{case_id}: {detail}")


def check(group: str, case_id: str, kind: str, cond: bool, detail: str) -> None:
    record(group, case_id, kind, bool(cond), detail)


def read(path: str) -> str:
    return (REPO / path).read_text(encoding="utf-8")


def has(path: str, needle: str) -> bool:
    return needle in read(path)


def lacks(path: str, needle: str) -> bool:
    return needle not in read(path)


# ---------------------------------------------------------------- HTTP / CLI
def http(method: str, path: str, payload: object = None, timeout: float = 10.0):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(
        BASE + path, data=data, method=method,
        headers={"Content-Type": "application/json"} if data else {},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        body = exc.read().decode()
        try:
            return exc.code, json.loads(body)
        except json.JSONDecodeError:
            return exc.code, {"raw": body}
    except Exception as exc:  # connection refused etc.
        return 0, {"error": str(exc)}


def cli(*args: str, timeout: float = 60.0):
    cmd = [str(CLI), *args] if HAS_CLI_BIN else [str(VPY), "-m", "BE.cli.processing.main", *args]
    proc = subprocess.run(
        cmd, capture_output=True, text=True, timeout=timeout,
    )
    out = proc.stdout.strip()
    parsed: object = None
    if out.startswith("{"):
        try:
            parsed, _ = json.JSONDecoder().raw_decode(out)
        except json.JSONDecodeError:
            parsed = None
    return proc.returncode, parsed, proc.stdout, proc.stderr


def py_snippet(code: str, db_root: Path, timeout: float = 60.0):
    env = dict(os.environ, APP_DB_ROOT=str(db_root))
    proc = subprocess.run(
        [str(VPY), "-c", code], capture_output=True, text=True, timeout=timeout,
        cwd=str(REPO), env=env,
    )
    return proc.returncode, proc.stdout, proc.stderr


def first_result(body: dict) -> dict:
    """First Results entry, or {} when the envelope carries none (error bodies)."""
    results = body.get("Results") or []
    return results[0] if results else {}


def registry_elements() -> list[dict]:
    tree = ast.parse(read("BE/ui_remote/registry.py"))
    for node in tree.body:
        if isinstance(node, ast.AnnAssign) and getattr(node.target, "id", "") == "ELEMENTS":
            return ast.literal_eval(node.value)  # type: ignore[arg-type]
        if isinstance(node, ast.Assign) and getattr(node.targets[0], "id", "") == "ELEMENTS":
            return ast.literal_eval(node.value)  # type: ignore[arg-type]
    raise AssertionError("ELEMENTS assignment not found in BE/ui_remote/registry.py")


def ts_mirror_ids() -> set[str]:
    return set(re.findall(r'id: "(ui-[^"]+)"', read("src/lib/ui-remote/registry.ts")))


def sql(db_path: Path, query: str):
    conn = sqlite3.connect(db_path)
    try:
        return conn.execute(query).fetchall()
    finally:
        conn.close()


# ---------------------------------------------------------------- Group A
def group_a(db_root: Path) -> None:
    g = "A"
    proc = subprocess.run(
        [str(VPY), "bin/db-bootstrap.py", "--db-root", str(db_root)],
        capture_output=True, text=True, timeout=120, cwd=str(REPO),
    )
    check(g, "A1", "cli", proc.returncode == 0, f"bootstrap exit={proc.returncode}")
    env = json.loads(proc.stdout) if proc.stdout.strip().startswith("{") else {}
    check(g, "A2", "cli", env.get("Status", {}).get("IsSuccess") is True,
          "bootstrap envelope IsSuccess")
    results = {r.get("Tier"): r for r in env.get("Results", [])}
    check(g, "A3", "cli", results.get("task", {}).get("SchemaVersion") == 29,
          f"task SchemaVersion={results.get('task', {}).get('SchemaVersion')}")
    check(g, "A4", "cli", results.get("root", {}).get("SchemaVersion") == 21,
          f"root SchemaVersion={results.get('root', {}).get('SchemaVersion')}")
    task_cols = {r[1] for r in sql(db_root / "task.db", "PRAGMA table_info(Error);")}
    check(g, "A5", "cli",
          {"CorrelationId", "Code", "Level", "Message", "StackTrace", "Details", "CreatedAt"} <= task_cols,
          f"task Error columns={sorted(task_cols)}")
    root_cols = {r[1]: r[2] for r in sql(db_root / "root.db", "PRAGMA table_info(SystemError);")}
    check(g, "A6", "cli",
          root_cols.get("SystemErrorId") == "INTEGER" and "ErrorId" in root_cols,
          f"root SystemError columns={sorted(root_cols)}")
    recipe_tables = sql(db_root / "root.db",
                        "SELECT name FROM sqlite_master WHERE type='table' AND name='Recipe';")
    check(g, "A7", "cli", len(recipe_tables) == 1, "root Recipe table exists")
    proc2 = subprocess.run(
        [str(VPY), "bin/db-bootstrap.py", "--db-root", str(db_root)],
        capture_output=True, text=True, timeout=120, cwd=str(REPO),
    )
    check(g, "A8", "cli", proc2.returncode == 0, f"second bootstrap exit={proc2.returncode}")


# ---------------------------------------------------------------- Group B
def group_b() -> None:
    g = "B"
    cid = f"e2e-single-{int(time.time())}"
    status, body = http("POST", "/errors", {
        "correlationId": cid, "code": "E_E2E_SINGLE", "level": "error",
        "message": "single object", "stackTrace": "line1\nline2",
    })
    check(g, "B1", "live", status == 200 and body["Results"][0]["inserted"] == 1,
          f"POST single status={status} body={str(body)[:200]}")
    c1, c2 = f"e2e-batch-a-{int(time.time())}", f"e2e-batch-b-{int(time.time())}"
    status, body = http("POST", "/errors", [
        {"correlationId": c1, "code": "E_E2E_A", "level": "error", "message": "a"},
        {"correlationId": c2, "code": "E_E2E_B", "level": "warn", "message": "b"},
    ])
    check(g, "B2", "live", status == 200 and body["Results"][0]["inserted"] == 2,
          f"POST array status={status}")
    c3 = f"e2e-items-{int(time.time())}"
    status, body = http("POST", "/errors", {"items": [
        {"correlationId": c3, "code": "E_E2E_ITEMS", "level": "error", "message": "items wrap"},
    ]})
    check(g, "B3", "live", status == 200 and body["Results"][0]["inserted"] == 1,
          f"POST items-wrap status={status}")
    status, body = http("POST", "/errors", {
        "correlationId": cid, "code": "E_E2E_SINGLE", "level": "error", "message": "retry",
    })
    check(g, "B4", "live", status == 200 and body["Results"][0]["inserted"] == 0
          and body["Results"][0]["skipped"] == 1, f"idempotent retry body={str(body)[:200]}")
    status, body = http("GET", "/errors?code=E_E2E_SINGLE")
    rows = first_result(body).get("items", body.get("Results", []))
    check(g, "B5", "live", status == 200 and any(
        r.get("CorrelationId") == cid for r in rows if isinstance(r, dict)),
        f"GET filter code status={status} rows={len(rows)}")
    status, body = http("GET", "/errors?level=warn")
    rows = first_result(body).get("items", [])
    check(g, "B6", "live", status == 200 and all(
        r.get("Level") == "warn" for r in rows if isinstance(r, dict)),
        f"GET filter level status={status}")
    sess = f"sess-e2e-{int(time.time())}"
    status, _ = http("POST", "/errors", {
        "correlationId": f"e2e-sess-{int(time.time())}", "code": "E_E2E_SESS",
        "level": "error", "message": "session row", "sessionId": sess,
    })
    status, body = http("GET", f"/errors?session_id={sess}")
    rows = first_result(body).get("items", [])
    check(g, "B7", "live", status == 200 and len(rows) >= 1,
          f"GET filter session status={status} rows={len(rows)}")
    status, body = http("GET", f"/errors/{cid}")
    row = first_result(body) if status == 200 else {}
    check(g, "B8", "live", status == 200 and row.get("StackTrace") == "line1\nline2",
          f"GET single full stack status={status} row={str(row)[:200]}")
    status, body = http("GET", "/errors/no-such-correlation-e2e")
    check(g, "B9", "live", status == 404 and body.get("Errors", {}).get("Code") == "E_BE_NOT_FOUND",
          f"GET unknown status={status}")
    status, body = http("POST", "/errors", {
        "correlationId": f"e2e-nolevel-{int(time.time())}",
        "code": "E_E2E_NOLEVEL", "message": "no level",
    })
    check(g, "B10", "live", status == 400, f"POST missing level status={status}")
    status, body = http("POST", "/errors", {
        "correlationId": f"e2e-nomsg-{int(time.time())}",
        "code": "E_E2E_NOMSG", "level": "error",
    })
    check(g, "B11", "live", status == 400, f"POST missing message status={status}")
    # Route contract: `context` merges into Details (string `details` is
    # stored verbatim; a dict `details` is NOT part of the wire shape).
    # Writer redaction (AC-01) must scrub sensitive keys from the merged dict.
    rcid = f"e2e-redact-{int(time.time())}"
    http("POST", "/errors", {
        "correlationId": rcid, "code": "E_E2E_REDACT", "level": "error",
        "message": "redaction row",
        "context": {"password": "hunter2", "apiKey": "sk-live-123", "safe": "keep-me"},
    })
    status, body = http("GET", f"/errors/{rcid}")
    row = first_result(body) if status == 200 else {}
    details = row.get("Details") or {}
    if isinstance(details, str):
        details = json.loads(details)
    check(g, "B12", "live", details.get("password") == "[REDACTED]"
          and details.get("apiKey") == "[REDACTED]" and details.get("safe") == "keep-me",
          f"redacted details={str(details)[:200]}")
    status, body = http("GET", "/errors?limit=2")
    rows = first_result(body).get("items", [])
    check(g, "B13", "live", status == 200 and len(rows) <= 2,
          f"GET limit=2 status={status} rows={len(rows)}")
    check(g, "B14", "live", row.get("Message") == "redaction row",
          f"redaction row message round-trips: {str(row.get('Message'))[:80]}")


# ---------------------------------------------------------------- Group C
def group_c(db_root: Path) -> None:
    g = "C"
    db = ["--db-root", str(db_root)]
    rc, env, _out, _err = cli("errors", *db, "list")
    items = first_result(env or {}).get("items", [])
    check(g, "C1", "cli", rc == 0 and isinstance(items, list) and len(items) >= 1,
          f"list rc={rc} items={len(items)}")
    rc, env, _o, _e = cli("errors", *db, "list", "--level", "error")
    items = first_result(env or {}).get("items", [])
    check(g, "C2", "cli", rc == 0 and all(
        i.get("Level") == "error" for i in items), f"list --level rc={rc}")
    rc, env, _o, _e = cli("errors", *db, "list", "--code", "E_E2E_SINGLE")
    items = first_result(env or {}).get("items", [])
    check(g, "C3", "cli", rc == 0 and all(
        i.get("Code") == "E_E2E_SINGLE" for i in items), f"list --code rc={rc}")
    rc, env, _o, _e = cli("errors", *db, "list", "--limit", "2")
    items = first_result(env or {}).get("items", [])
    check(g, "C4", "cli", rc == 0 and len(items) <= 2, f"list --limit 2 rc={rc}")
    rc, _env, out, _e = cli("errors", *db, "list", "--limit", "500")
    check(g, "C5", "cli", rc != 0 and "between 1 and 200" in out,
          f"list --limit 500 rc={rc}")
    # Show the newest error actually present (written by group B).
    rc, env, _o, _e = cli("errors", *db, "list", "--limit", "1")
    newest = first_result(env or {}).get("items", [{}])[0]
    newest_cid = newest.get("CorrelationId", "")
    rc, env, _o, _e = cli("errors", *db, "show", newest_cid)
    shown = first_result(env or {}) if rc == 0 else {}
    check(g, "C6", "cli", rc == 0 and shown.get("CorrelationId") == newest_cid
          and "StackTrace" in shown, f"show newest rc={rc} cid={newest_cid}")
    rc, _env, out, err = cli("errors", *db, "show", "nope-unknown-e2e")
    check(g, "C7", "cli", rc == 3 and "E_BE_NOT_FOUND" in out + err,
          f"show unknown rc={rc}")
    rc, env, _o, _e = cli("errors", *db, "export", "--format", "json")
    exp = first_result(env or {}) if rc == 0 else {}
    check(g, "C8", "cli", rc == 0 and isinstance(exp.get("errors"), list)
          and exp.get("format") == "json",
          f"export json rc={rc} keys={sorted(exp.keys())}")
    rc, env, _o, _e = cli("errors", *db, "export", "--format", "csv")
    exp = first_result(env or {}) if rc == 0 else {}
    csv_text = exp.get("csv", "")
    header = csv_text.splitlines()[0] if csv_text else ""
    check(g, "C9", "cli", rc == 0 and "correlationId" in header and "code" in header,
          f"export csv header={header!r}")
    fresh = db_root.parent / "fresh-nodb"
    rc, env, _o, _e = cli("errors", "--db-root", str(fresh), "list")
    items = first_result(env or {}).get("items", None)
    check(g, "C10", "cli", rc == 0 and items == [],
          f"unbootstrapped list rc={rc} items={items}")
    proc = subprocess.run(
        [str(VPY), "bin/db-bootstrap.py", "--db-root", str(fresh)],
        capture_output=True, text=True, timeout=120, cwd=str(REPO),
    )
    check(g, "C11", "cli", proc.returncode == 0,
          f"bootstrap after self-heal exit={proc.returncode}")
    rc, env, _o, _e = cli("errors", *db, "list", "--limit", "2")
    items = first_result(env or {}).get("items", [])
    check(g, "C12", "cli", rc == 0 and len(items) == 2
          and items[0].get("CreatedAt", 0) >= items[1].get("CreatedAt", 0),
          "list newest-first order")


# ---------------------------------------------------------------- Group D
def group_d() -> None:
    g = "D"
    elements = registry_elements()
    check(g, "D1", "static", len(elements) == 27, f"registry entries={len(elements)}")
    bad = [e.get("id") for e in elements
           if not e.get("id") or not e.get("name") or not e.get("kind") or not e.get("xpath")]
    check(g, "D2", "static", not bad, f"entries missing id/name/kind/xpath: {bad}")
    ids = [e["id"] for e in elements]
    check(g, "D3", "static", len(ids) == len(set(ids)), "registry ids unique")
    check(g, "D4", "static", {"ui-window-minimize", "ui-window-maximize", "ui-window-close"} <= set(ids),
          "window controls present")
    check(g, "D5", "static", {"ui-greyscale-level", "ui-greyscale-mode-threshold",
          "ui-greyscale-mode-stretch", "ui-greyscale-mode-one-bit"} <= set(ids),
          "greyscale controls present")
    check(g, "D6", "static", {"ui-sim-dwell", "ui-sim-next", "ui-sim-previous",
          "ui-sim-takeover", "ui-sim-exit"} <= set(ids), "simulation controls present")
    check(g, "D7", "static", {"ui-pin1-canvas", "ui-pin1-canvas-wrap", "ui-pin1-layers-panel",
          "ui-pin1-pattern-shape-rectangle", "ui-pin1-pattern-shape-circle",
          "ui-pin1-pattern-shape-ellipse", "ui-pin1-pattern-shape-polygon"} <= set(ids),
          "pin1 controls present")
    check(g, "D8", "static", "ui-project-camera-select" in ids, "camera select present")
    check(g, "D9", "static", {"ui-whitebox-layers-panel", "ui-pin1-layers-panel"} <= set(ids),
          "layers panels present")
    rc, env, _o, _e = cli("ui", "--backend", BASE, "ls")
    listed = first_result(env or {}).get("Elements", [])
    check(g, "D10", "cli", rc == 0 and len(listed) == 27,
          f"ui ls rc={rc} elements={len(listed)}")
    rc, env, _o, _e = cli("ui", "--backend", BASE, "click", "ui-window-close")
    pkt = first_result(env or {}) if rc == 0 else {}
    packet_id = pkt.get("packetId", "")
    check(g, "D11", "cli", rc == 0 and pkt.get("status") == "queued" and packet_id,
          f"click no --wait rc={rc} packet={pkt}")
    rc, _env, out, _e = cli("ui", "--backend", BASE, "click", "ui-no-such-id")
    check(g, "D12", "cli", rc != 0 and "Unknown element id" in out,
          f"click unknown rc={rc}")
    xpath = next(e["xpath"] for e in elements if e["id"] == "ui-window-minimize")
    rc, env, _o, _e = cli("ui", "--backend", BASE, "click", xpath)
    pkt = first_result(env or {}) if rc == 0 else {}
    check(g, "D13", "cli", rc == 0 and pkt.get("status") == "queued",
          f"click by xpath rc={rc} packet={pkt}")
    rc, _env, out, _e = cli("ui", "--backend", BASE, "--wait", "--timeout", "2",
                            "click", "ui-window-close")
    check(g, "D14", "cli", rc != 0 and "Timed out" in out,
          f"click --wait no frontend rc={rc}")
    rc, env, _o, _e = cli("ui", "--backend", BASE, "set", "ui-greyscale-level", "128")
    pkt = first_result(env or {}) if rc == 0 else {}
    check(g, "D15", "cli", rc == 0 and pkt.get("status") == "queued",
          f"set greyscale-level rc={rc}")
    rc, _env, out, _e = cli("ui", "--backend", BASE, "set", "ui-greyscale-level")
    check(g, "D16", "cli", rc != 0 and "set requires a value" in out,
          f"set without value rc={rc}")
    rc, env, _o, _e = cli("ui", "--backend", BASE, "set", "ui-sim-dwell", "2")
    pkt = first_result(env or {}) if rc == 0 else {}
    check(g, "D17", "cli", rc == 0 and pkt.get("status") == "queued",
          f"set sim-dwell rc={rc}")
    rc, env, _o, _e = cli("ui", "--backend", BASE, "audit")
    audit = first_result(env or {}) if rc == 0 else {}
    check(g, "D18", "cli", rc == 0 and isinstance(audit.get("Entries"), list),
          f"audit returns an Entries list rc={rc} audit={str(audit)[:200]}")
    rc, env, _o, _e = cli("ui", "--backend", BASE, "result", packet_id)
    res = first_result(env or {}) if rc == 0 else {}
    check(g, "D19", "cli", rc == 0 and res.get("status") in ("pending", "queued"),
          f"result pending rc={rc} result={res}")
    check(g, "D20", "static", ts_mirror_ids() == set(ids),
          f"TS mirror ids match Python registry ({len(ts_mirror_ids())} ids)")


# ---------------------------------------------------------------- Group E
def group_e() -> None:
    g = "E"
    btn = "src/components/layout/WindowControlButtons.tsx"
    code_lines = [ln for ln in read(btn).splitlines()
                  if not ln.strip().startswith(("*", "//"))]
    check(g, "E1", "static", not any("location.href" in ln for ln in code_lines),
          "no reload-via-location.href in window controls code (comment mentions only)")
    check(g, "E2", "static", has(btn, 'WINDOW_EXIT_REQUEST_EVENT = "cat-vision:request-exit"')
          and has(btn, "WINDOW_EXIT_REQUEST_EVENT"),
          "Exit dispatches cat-vision:request-exit")
    shut = "BE/routes/shutdown.py"
    check(g, "E3", "static", has(shut, "_LOOPBACK_HOSTS")
          and has(shut, "shutdown_rejected_non_loopback"),
          "shutdown route has loopback guard + 403")
    sh = "packaging/desktop/start.sh"
    check(g, "E4", "static", has(sh, "wait_for_url") and has(sh, "trap stop_own_services")
          and has(sh, 'wait "$BROWSER_PID"'),
          "start.sh waits for services, traps teardown, waits on browser")
    check(g, "E5", "static", (REPO / "packaging/desktop/start.ps1").exists()
          and has("packaging/desktop/start.ps1", "Stop-Process"),
          "start.ps1 exists with teardown")
    check(g, "E6", "static", has(shut, "loopback only"),
          "shutdown trust model documented as loopback-only")
    check(g, "E7", "static", has(btn, "Minimize Window") and has(btn, "Close Application"),
          "window buttons carry visible names for the registry")


# ---------------------------------------------------------------- Group F
def group_f() -> None:
    g = "F"
    canvas = "src/components/vision/standard/tools/pin1-config/Pin1Canvas.tsx"
    tool = "src/components/vision/standard/tools/pin1-config/Pin1MarkingTool.tsx"
    panel = "src/components/vision/white-box/LayersPanel.tsx"
    check(g, "F1", "static", has(canvas, "internalSearchLocked, setInternalSearchLocked] = useState(true)"),
          "Pin1 canvas default lock is true")
    check(g, "F2", "static", has(canvas, "onDoubleClick")
          and has(canvas, "setInternalSearchLocked"),
          "double-click unlock handler exists")
    check(g, "F3", "static", has(canvas, "showHandles: props.regionEditMode === \"search\" && !isSearchLocked"),
          "locked canvas draws no handles")
    check(g, "F4", "static", has(tool, "isSearchLocked={isSearchLocked}")
          and has(tool, "layerOrder={layerOrder}"),
          "tool passes lock + layer order to canvas")
    check(g, "F5", "static", has(tool, "onToggleLayerLock")
          and has(tool, "onBringLayerForward") and has(tool, "onSendLayerBackward"),
          "tool passes lock/reorder handlers to LayersPanel")
    check(g, "F6", "static", has(panel, 'kind === "roi"'),
          "panel lock button renders for roi rows")
    check(g, "F7", "static", has(panel, "isLayerReorderable"),
          "panel gates reorder chevrons on isLayerReorderable")
    check(g, "F8", "static", has(canvas, "export function movePin1Layer")
          or has(canvas, "export const movePin1Layer"),
          "movePin1Layer exported for the tool")
    check(g, "F9", "static", has(canvas, '"SEARCH REGION • LOCKED"'),
          "locked canvas labels the region LOCKED")
    pat = "src/components/vision/white-box/PatternCanvas.tsx"
    check(g, "F10", "static", has(pat, "greyscaleMode"),
          "PatternCanvas receives greyscaleMode")
    check(g, "F11", "static", has(pat, "rotateHandlePoint"),
          "PatternCanvas has a rotate handle")


# ---------------------------------------------------------------- Group G
def group_g() -> None:
    g = "G"
    tool = "src/components/vision/standard/tools/pin1-config/Pin1MarkingTool.tsx"
    canvas = "src/components/vision/standard/tools/pin1-config/Pin1Canvas.tsx"
    check(g, "G1", "static", all(
        has(tool, f'data-automation-id="pin1-shape-{s}"')
        for s in ("rectangle", "circle", "ring", "square")),
        "Pin1 picker has 4 shape buttons")
    check(g, "G2", "static", has(tool, "shapeType={model.shapeType}"),
          "canvas renders the picker shapeType, not a hardcoded shape")
    check(g, "G3", "static", has(canvas, 'ctx.arc(hole.centerX, hole.centerY, hole.radius, 0, Math.PI * 2)')
          and has(canvas, 'ctx.strokeRect(hole.centerX - side / 2'),
          "circle + square overlays drawn from hole geometry")
    check(g, "G4", "static", has(canvas, 'Math.max(2, hole.radius * 0.55)'),
          "ring overlay draws inner + outer circles")
    lib = "src/lib/vision/white-box-marking.ts"
    check(g, "G5", "static", has(lib, 'export type GrayscaleMode = "threshold" | "stretch" | "one-bit"'),
          "GrayscaleMode union is threshold|stretch|one-bit")
    check(g, "G6", "static", has(lib, "rangeSpan") and has(lib, "lowCutoff"),
          "stretch applies a full-range contrast stretch")
    check(g, "G7", "static", has(lib, "stretched >= 128 ? 255 : 0"),
          "one-bit quantizes to black/white")
    slider = "src/components/vision/white-box/GreyscaleSliderCard.tsx"
    check(g, "G8", "static", has(slider, 'onGreyscaleModeChange?.("one-bit")')
          and has(slider, 'onGreyscaleModeChange?.("stretch")')
          and has(slider, 'onGreyscaleModeChange?.("threshold")'),
          "slider offers all three mode buttons")
    hook = "src/components/vision/white-box/useWhiteBoxMarking.ts"
    check(g, "G9", "static", has(hook, "greyscaleMode,")
          and has(hook, "function changeGreyscaleMode"),
          "marking hook exposes mode + changer")
    check(g, "G10", "static", has("src/lib/vision/workpiece-rule-analyzer.ts", ".trim().toLowerCase()"),
          "shape reader normalizes case (legacy lowercase accepted)")
    rc, env, _o, _e = cli("ui", "--backend", BASE, "click", "ui-pin1-pattern-shape-circle")
    pkt = first_result(env or {}) if rc == 0 else {}
    check(g, "G11", "cli", rc == 0 and pkt.get("status") == "queued",
          f"click pin1 shape circle rc={rc}")
    rc, env, _o, _e = cli("ui", "--backend", BASE, "click", "ui-greyscale-mode-stretch")
    pkt = first_result(env or {}) if rc == 0 else {}
    check(g, "G12", "cli", rc == 0 and pkt.get("status") == "queued",
          f"click greyscale stretch rc={rc}")


# ---------------------------------------------------------------- Group H
def group_h() -> None:
    g = "H"
    tour = "src/components/guided-simulation/ProjectCreationAnalysisTour.tsx"
    check(g, "H1", "static", has(tour, "const waitStartedAt = Date.now();"),
          "tour step wait uses Date.now wall clock")
    check(g, "H2", "static", lacks(tour, "+= 100"),
          "no tick-counted dwell increment in tour")
    check(g, "H3", "static", has(tour, "flipOptions: false"),
          "tour tooltip disables flip so it stays pinned")
    check(g, "H4", "static", has(tour, "minHeight: 160"),
          "tour tooltip keeps minHeight 160")
    switch = "src/components/ui-mode/UiModeSwitch.tsx"
    check(g, "H5", "static", read(switch).count("w-[70px]") >= 2,
          "mode switch labels are fixed w-[70px]")
    check(g, "H6", "static", lacks(switch, "group-hover:gap-2"),
          "no hover-expand gap jump in mode switch")
    shell = "src/components/layout/StandardAppShell.tsx"
    check(g, "H7", "static", has(shell, "border border-transparent"),
          "menu items reserve border so hover does not jump layout")
    bar = "src/components/guided-simulation/SimulationPlayerBar.tsx"
    check(g, "H8", "static", has(bar, "dwellTimeSec")
          and has(bar, "Screen dwell duration in seconds"),
          "simulation bar shows dwell seconds")
    check(g, "H9", "static", has(tour, "shiftOptions: {")
          and has(tour, "padding: { top: 60"),
          "tour tooltip keeps shift padding for the pinned layout")


# ---------------------------------------------------------------- Group I
def group_i() -> None:
    g = "I"
    facade = "src/lib/camera/facade.ts"
    check(g, "I1", "static", has(facade, 'window.addEventListener("storage"'),
          "camera facade listens for cross-document storage events")
    check(g, "I2", "static", has(facade, "CAMERA_LIBRARY_STORAGE_KEY")
          and has(facade, "s.setItem(CAMERA_LIBRARY_STORAGE_KEY"),
          "camera saves persist to the shared library key")
    modal = "src/features/projects/modals/SaveCameraSetupModal.tsx"
    check(g, "I3", "static", has(modal, "}, [open]);"),
          "camera modal reset effect deps are [open] only")
    check(g, "I4", "static", has(modal, "must never wipe the operator's in-progress draft"),
          "modal draft survives library refreshes while open")
    stream = "src/components/vision/white-box/useCameraStream.ts"
    check(g, "I5", "static", has(stream, "CAMERA_PERMISSION_WATCHDOG_MS = 15000"),
          "camera permission watchdog is 15s")
    ws = "src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx"
    check(g, "I6", "static", has(ws, 'data-ui-id="ui-camera-retry"')
          and has(ws, "onClick={retryLiveCamera}"),
          "retry button wired to the camera hook retry()")
    check(g, "I7", "static", has(ws, "} = useCameraStream(isLiveCameraMode);"),
          "camera hook follows the live-camera mode toggle")
    check(g, "I8", "static", has(ws, "isPermissionPending: isLiveCameraPermissionPending,"),
          "workspace reads the hook permission-pending flag")


# ---------------------------------------------------------------- Group J
def group_j(db_root: Path) -> None:
    g = "J"
    status, body = http("POST", "/bug-reports", {"title": "probe", "description": "probe bug"})
    check(g, "J1", "live", status == 503 and "Supabase is not configured" in str(body),
          f"POST /bug-reports unconfigured status={status}")
    status, body = http("GET", "/bug-reports/config")
    res = first_result(body) if status == 200 else {}
    check(g, "J2", "live", status == 200
          and res.get("supabase", {}).get("is_configured") is False
          and "sk-" not in json.dumps(body),
          f"GET /bug-reports/config status={status} result={str(res)[:200]}")
    status, body = http("GET", "/bug-reports/pending")
    check(g, "J3", "live", status == 503, f"GET /bug-reports/pending status={status}")
    rc, _env, out, err = cli("bug-reports", "pending")
    check(g, "J4", "cli", rc != 0 and "E_BE_UNAVAILABLE" in out + err,
          f"CLI pending unconfigured rc={rc}")
    rc, _env, out, err = cli("bug-reports", "send", "--correlation-id", "probe-nope-e2e")
    check(g, "J5", "cli", rc != 0 and "Traceback" not in out + err,
          f"CLI send unconfigured rc={rc} (honest error, no traceback)")
    schema = read("BE/bug_reports/schema.sql")
    check(g, "J6", "static", "public.bug_reports" in schema and "public.bug_attachments" in schema,
          "Supabase schema has both bug tables")
    client = read("BE/bug_reports/supabase_client.py")
    check(g, "J7", "static", '"apikey"' in client and '"Authorization"' in client
          and "Bearer" in client, "PostgREST uses apikey + Bearer headers")
    sender = read("BE/bug_reports/email_sender.py")
    check(g, "J8", "static", "NEVER reads, holds," in sender or "never" in sender.lower()
          and "password" in sender.lower(),
          "email sender delegates and never holds a password")
    code = (
        "from BE.repos.sqlite_rules_repo import SqliteRulesRepo\n"
        "repo = SqliteRulesRepo()\n"
        "env = {'SchemaVersion': 1, 'RuleSetId': 424242, 'Name': 'E2E Fresh',\n"
        "       'Version': 1, 'Enabled': True, 'Rules': [],\n"
        "       'DraftMeta': {'ClientId': 'e2e', 'UpdatedAt': '2026-10-31T00:00:00Z',\n"
        "                    'Origin': 'server'}}\n"
        "saved = repo.save_rule_set(env)\n"
        "loaded = repo.get_rule_set(424242)\n"
        "assert loaded.Name == 'E2E Fresh', loaded.Name\n"
        "print('fresh-save-ok')\n"
    )
    rc, out, err = py_snippet(code, db_root)
    check(g, "J9", "cli", rc == 0 and "fresh-save-ok" in out,
          f"fresh empty root.db save without bootstrap rc={rc} err={err[-300:]}")
    code2 = (
        "from BE.repos.sqlite_rules_repo import SqliteRulesRepo\n"
        "repo = SqliteRulesRepo()\n"
        "env = {'SchemaVersion': 1, 'RuleSetId': 424242, 'Name': 'E2E Fresh v2',\n"
        "       'Version': 2, 'Enabled': True, 'Rules': [],\n"
        "       'DraftMeta': {'ClientId': 'e2e', 'UpdatedAt': '2026-10-31T01:00:00Z',\n"
        "                    'Origin': 'server'}}\n"
        "saved = repo.save_rule_set(env)\n"
        "assert saved.Version >= 3, saved.Version\n"
        "print('version-bump-ok')\n"
    )
    rc, out, err = py_snippet(code2, db_root)
    check(g, "J10", "cli", rc == 0 and "version-bump-ok" in out,
          f"re-save auto-increments version rc={rc} err={err[-300:]}")
    code3 = (
        "from BE.repos.sqlite_rules_repo import SqliteRulesRepo\n"
        "from BE.errors.apperror import AppError\n"
        "from BE.db.connections import get_task_conn\n"
        "repo = SqliteRulesRepo()\n"
        "try:\n"
        "    repo.save_rule_set({'SchemaVersion': 99, 'RuleSetId': 1})\n"
        "    raise SystemExit('expected AppError')\n"
        "except AppError:\n"
        "    pass\n"
        "with get_task_conn() as conn:\n"
        "    rows = conn.execute(\"SELECT COUNT(*) FROM Error WHERE Code = 'E_BE_BAD_REQUEST'\").fetchone()\n"
        "assert rows[0] >= 1, rows\n"
        "print('failure-recorded-ok')\n"
    )
    rc, out, err = py_snippet(code3, db_root)
    check(g, "J11", "cli", rc == 0 and "failure-recorded-ok" in out,
          f"forced save failure recorded rc={rc} err={err[-300:]}")
    modal = "src/components/recorder/RecorderExportModal.tsx"
    check(g, "J12", "static", has(modal, "resolveBackendBaseUrl()")
          and has(modal, "/bug-reports"),
          "RECORD BUG modal posts via resolveBackendBaseUrl")


# ---------------------------------------------------------------- Group K (LAST)
def group_k(backend_proc: subprocess.Popen) -> None:
    g = "K"
    status, body = http("POST", "/shutdown", timeout=5.0)
    check(g, "K1", "live", status == 200 and body.get("Status", {}).get("IsSuccess") is True,
          f"POST /shutdown status={status}")
    exited = False
    for _ in range(20):
        if backend_proc.poll() is not None:
            exited = True
            break
        time.sleep(0.5)
    check(g, "K2", "live", exited, f"backend exited within 10s (rc={backend_proc.poll()})")


def main() -> int:
    if not VPY.exists():
        print(f"FAIL: python interpreter missing: {VPY}")
        return 2
    keep_tmp = "--keep-tmp" in sys.argv
    tmp = Path(tempfile.mkdtemp(prefix="e2e-spec54-"))
    db_root = tmp / "db"
    print(f"[e2e-spec54] tmp={tmp} backend={BASE}")
    env = dict(os.environ, APP_DB_ROOT=str(db_root))
    backend = subprocess.Popen(
        [str(VPY), "-m", "uvicorn", "BE.main:app", "--host", "127.0.0.1",
         "--port", str(PORT)],
        cwd=str(REPO), env=env, stdout=open(tmp / "backend.log", "w"),
        stderr=subprocess.STDOUT,
    )
    try:
        healthy = False
        for _ in range(60):
            status, _ = http("GET", "/healthz", timeout=2.0)
            if status == 200:
                healthy = True
                break
            time.sleep(0.5)
        if not healthy:
            print("FAIL: backend did not become healthy on /healthz")
            return 2
        group_a(db_root)
        group_b()
        group_c(db_root)
        group_d()
        group_e()
        group_f()
        group_g()
        group_h()
        group_i()
        group_j(db_root)
        group_k(backend)
    finally:
        if backend.poll() is None:
            backend.terminate()
            try:
                backend.wait(timeout=10)
            except subprocess.TimeoutExpired:
                backend.kill()
    by_kind: dict[str, list[int]] = {}
    failed = 0
    for _grp, _cid, kind, detail in RESULTS:
        slot = by_kind.setdefault(kind, [0, 0])
        slot[1] += 1
        if detail.startswith(PASS):
            slot[0] += 1
        else:
            failed += 1
    total = len(RESULTS)
    print(f"\n[e2e-spec54] {total - failed}/{total} passed")
    for kind, (ok, n) in sorted(by_kind.items()):
        print(f"  {kind}: {ok}/{n} passed")
    if failed:
        print("  failures:")
        for grp, cid, kind, detail in RESULTS:
            if detail.startswith(FAIL):
                print(f"    {grp}/{cid} ({kind}): {detail[6:]}")
    if keep_tmp:
        print(f"[e2e-spec54] kept tmp dir: {tmp}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
