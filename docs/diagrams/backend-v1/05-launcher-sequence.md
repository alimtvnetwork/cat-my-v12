# 05 - Launcher Sequence (`run.ps1` / `run.sh`)

Startup order and readiness gates for the dev launcher. Feeds `spec/21-app/shell/26-dev-launcher.md` (Step 7).

```mermaid
sequenceDiagram
  autonumber
  participant U as Operator
  participant SH as run.ps1 / run.sh
  participant BE as BE (uvicorn 127.0.0.1:$BE_PORT)
  participant FE as FE (vite 127.0.0.1:$FE_PORT)
  participant CH as Chromium shell / dev harness

  U->>SH: run --be-port 8787 --fe-port 5173
  SH->>SH: parse flags, resolve env (BE_PORT, FE_PORT, UI_BACKEND_BASE_URL)
  SH->>BE: spawn (child pid tracked)
  loop up to 30s
    SH->>BE: GET /healthz
    BE-->>SH: 200 { Status:{IsSuccess:true} }
  end
  SH->>FE: spawn (child pid tracked)
  loop up to 30s
    SH->>FE: TCP connect $FE_PORT
    FE-->>SH: accept
  end
  alt --no-shell
    SH-->>U: URLs printed; foreground wait
  else default
    SH->>CH: launch with ?backend=$UI_BACKEND_BASE_URL
    CH-->>U: window opens
  end

  Note over SH: trap EXIT / finally -> kill child pids<br/>idempotent re-run (kills stale pids on same ports)
```

## Env contract

- `BE_PORT` (default 8787), `FE_PORT` (default 5173), `UI_BACKEND_BASE_URL` (default `http://localhost:$BE_PORT`).
- Health probe endpoint: `GET /healthz` returns envelope `{ Status:{IsSuccess:true, HttpCode:200} }`.
- Chromium shell scope pending `spec/21-app/shell/01-adr-shell-choice.md` re-read at Step 21; if that ADR forbids a production extension shell, the `CH` participant downgrades to a dev harness only.
