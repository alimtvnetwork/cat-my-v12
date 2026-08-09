# 01 - Mode Toggle (`useBackend()`)

Shows how the FE picks Seed vs Backend at boot and on runtime changes from Home / Settings.

```mermaid
flowchart TD
  Boot([App boot]) --> ReadLS["Read localStorage['ui.backend.baseUrl']"]
  ReadLS --> Hydrate["Hydrate runtime knob<br/>app.backend.baseUrl<br/>app.backend.mode"]
  Hydrate --> Validate{"isValidBackendPrefix(url)<br/>^https?://[^/]+(/[^/].*)?$"}
  Validate -- invalid --> FallSeed["mode := SEED<br/>toast + emit E_BE_INVALID_BASE_URL"]
  Validate -- valid --> ModeCheck{"app.backend.mode"}
  ModeCheck -- SEED --> UseSeed["useBackend() -> SeedBackend<br/>(in-memory fixtures)"]
  ModeCheck -- BACKEND --> Egress{"host is loopback?"}
  Egress -- no --> ConfirmEgress["Settings requires explicit confirm<br/>else E_SEC_UNAPPROVED_EGRESS"]
  Egress -- yes --> UseHttp["useBackend() -> HttpBackend<br/>base = app.backend.baseUrl"]
  ConfirmEgress -- confirmed --> UseHttp
  ConfirmEgress -- refused --> FallSeed

  FallSeed --> Consumer[["Components call BackendClient interface<br/>NO mode branching in components"]]
  UseSeed --> Consumer
  UseHttp --> Consumer

  subgraph RuntimeChange["Runtime change (Home widget / Settings form)"]
    ChangeUrl["User edits baseUrl or toggles mode"] --> Persist["Write ui.backend.baseUrl<br/>+ update app.backend.* knobs"]
    Persist --> Validate
  end
```

## Reads

- `ui.backend.baseUrl` (localStorage, UI-local allowlist per `27-config-surface.md`)
- `app.backend.mode` runtime knob (default `SEED`)
- `app.backend.baseUrl` runtime knob (default `http://localhost:8787`)

## Emits

- `E_BE_INVALID_BASE_URL` on regex fail
- `E_SEC_UNAPPROVED_EGRESS` on non-loopback without confirm
