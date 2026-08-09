# ADR AI-01 — Chromium Shell choice

Status: Accepted — 2026-07-14
Supersedes: TBD markers in `spec/21-app/10-app-overview.md`,
`spec/21-app/11-system-context.md`, `spec/21-app/03-glossary.md`.

## Context

The app has a Python-heavy backend (capture, dispatcher, rules, audit) and a
React/HTML/CSS UI. Delivery must be desktop, offline-capable, code-signed,
and support self-update via `spec/14-update/*`. Open question AI-01 required a
choice between CEF, Tauri, Electron, and pywebview.

## Options

Each option evaluated against: binary size, Python coupling, signing +
notarization support, IPC ergonomics, ecosystem risk, license, and
maintenance burden.

### Option 1 — Electron + Python sidecar

- Pros: mature, huge ecosystem, straightforward Chromium renderer.
- Cons: large binary (~120 MB base), high memory, Node runtime we do not
  otherwise need, signing pipeline standard but heavy.
- Reversal cost: medium (mostly packaging + IPC transport changes).

### Option 2 — Tauri + Python sidecar

- Pros: small binary (~10 MB Rust host), uses OS WebView (WebView2 / WKWebView
  / webkitgtk), first-class signing hooks, per-launch loopback IPC is native.
- Cons: Linux WebView (webkitgtk) versioning is uneven; requires Rust in build
  toolchain; renderer engine varies per OS (test matrix grows).
- Reversal cost: medium.

### Option 3 — CEF via `cefpython3`

- Pros: single-language host (Python), embeds Chromium directly (uniform
  renderer across OSes).
- Cons: `cefpython3` release cadence lags upstream Chromium; larger binary
  than Tauri; notarization workflow is bespoke; smaller community.
- Reversal cost: high (Python-only host locks packaging).

### Option 4 — pywebview

- Pros: minimal, pure-Python host, trivial to bootstrap.
- Cons: uses system WebView (same OS variance as Tauri) without Tauri's
  security primitives; no built-in updater; no built-in IPC bridge with
  security defaults; not appropriate for signed enterprise delivery.
- Reversal cost: low (fallback role only).

## Decision

**Primary: Tauri + Python sidecar.**

- Uniform, small, signed native binary per OS.
- Renderer runs in OS WebView with strict CSP + origin lock (`app://`).
- Python worker spawned as supervised sidecar; IPC over loopback HTTP+WS with
  a per-launch bearer token injected via preload (see `04-ipc-contract.md`).
- Self-update via Tauri updater feed, verified against a project-owned Ed25519
  key; migration hooks ordered per `spec/14-update/*`.

**Fallback: pywebview** for pure-Python environments where Rust toolchain is
unavailable. Same IPC contract; missing features (updater, signed bundles)
must be provided by external tooling.

## Consequences

- Build toolchain adds Rust (`cargo`, `tauri-cli`) alongside Vite + Python.
- Signing pipeline: Windows Authenticode, macOS Developer ID + notarization,
  Linux GPG detached signatures.
- Renderer test matrix: WebView2 (Win 10+), WKWebView (macOS 12+), webkitgtk
  (Ubuntu 22.04+).
- Update feed URL, signature key custody, and migration hook order are defined
  in `08-updates-binding.md`.

## Reversal cost

Estimated 4–6 engineering weeks to swap host (Tauri ↔ Electron) once IPC and
UI map stabilize. The IPC contract in `04-ipc-contract.md` is host-agnostic
and does not need to change on swap.
