---
Slug: adr-shell-choice
Parent: 28-chromium-shell-spec
Status: pending
Created: 2026-07-14
---

# SS-02 — ADR AI-01: shell choice

Produce `spec/21-app/shell/01-adr-shell-choice.md` using the ADR template already used in this repo. Required content:

- Status: Proposed → Accepted (with date).
- Context: Python-heavy backend, Node/Next UI, need for signed desktop delivery, offline-first, self-update per `spec/14-update/`.
- Options considered (each with pros / cons / cost-to-reverse):
  1. Electron + Python sidecar (spawn worker as child process).
  2. Tauri + Python sidecar (Rust host, WebView2/WKWebView/webkitgtk renderer).
  3. CEF via Python bindings (cefpython3) — single-language host.
  4. pywebview — thin, uses system WebView.
- Decision matrix scored on: binary size, signing/notarization support, IPC ergonomics with Python, memory footprint, ecosystem risk, licensing, maintenance burden.
- Decision: pick ONE and justify. Default recommendation to encode unless overridden: **Tauri + Python sidecar** for signed native binaries and small footprint, with `pywebview` listed as a fallback for pure-Python teams.
- Consequences: what changes downstream (packaging, IPC transport, signing pipeline, developer setup).
- Reversal cost: rough weeks-of-work estimate.
- Links: `../10-app-overview.md`, `../11-system-context.md`, `spec/14-update/`.
