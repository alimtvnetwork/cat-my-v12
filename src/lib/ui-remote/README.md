# UI Remote Control (spec 54)

CLI-to-UI bridge for the browser `--app` SPA. Adapted from the Antigravity
Manager chain (CLI → HTTP → frontend event → real `el.click()`), without a
Tauri event bus: the backend holds an in-memory packet queue that the
frontend hook polls.

## Registry

Single source of truth: `BE/ui_remote/registry.py`. Every entry has an
`Id`, a visible `name`, and an `XPath`, verified against a real component
source. Ids are never invented.

Regenerate the TypeScript mirror after editing the Python registry:

```
python3 03-ai-scripts/generate-ui-remote-registry.py
```

Never edit `src/lib/ui-remote/registry.ts` by hand.

## Backend endpoints (Universal Envelope)

- `GET /ui-remote/elements?route=` — registry entries for a route.
- `POST /ui-remote/packets` — enqueue `{ action, elementId?, xpath?,
route?, value?, actor? }`. Actions: click, scroll, focus, set, navigate.
- `GET /ui-remote/pending` — queued packets (polled by the hook).
- `POST /ui-remote/results` — hook execution result per packet.
- `GET /ui-remote/results/{packetId}` — queued or completed state.
- `GET /ui-remote/audit?limit=` — audited CLI-driven actions.

Audit trail: JSONL at `$UI_REMOTE_AUDIT_PATH`, else the OS temp dir
(`cat-my-ui-remote-audit.jsonl`). Nothing is written into the repo tree.

## Frontend hook

`src/hooks/useUiRemoteControl.ts`, mounted once in `StandardAppShell`.
It polls every second, resolves each target with the AGM fallback chain
(`getElementById` → `[data-ui-id]` → `[data-ui-name]` → `[data-testid]`
→ `[title]` → XPath), performs the action through the same code path as
a user click, and reports the real result. Missing elements are captured
into the error store as tracked warnings — never silent failures.

## CLI (processing-cli, batch C)

```
processing-cli ui ls [--route <route>]
processing-cli ui click <id-or-xpath> [--route <route>] [--wait]
processing-cli ui scroll <id-or-xpath>
processing-cli ui navigate <route>
processing-cli ui set <id-or-xpath> <value> [--wait]
processing-cli ui audit [--limit <n>]
```

`click`/`set` without `--wait` report `queued` honestly with the packet
id; with `--wait` they poll until the hook performs or fails the action
and exit non-zero on failure. A click is never claimed performed before
the hook reports it.

## CLI-settable vision controls (v1)

- `ui-greyscale-level` — Greyscale Level slider, range 0–255
  (`ui set ui-greyscale-level 170 --wait`).
- `ui-sim-dwell` — simulation dwell slider, range 2–10 seconds.
- `ui-project-camera-select` — Bound setting select (value must match
  an existing camera option id).

## Follow-ups (not invented)

Vision marking screens (`WhiteBoxMarkingTool`, `Pin1Canvas`,
`Pin1SettingsCard`, `PatternCanvas`) carry no `data-testid` / `aria-label`
/ `id` attributes, so their buttons cannot be registered until the
vision workstream adds `data-ui-id` attributes. The grayscale slider
XPath is structural for the same reason. Route scoping is `["*"]` for v1
entries (ids are unique app-wide) and tightens once screens gain ids.
