# Backend v1 Diagrams (Index)

Slug: backend-v1-diagrams-index
Status: accepted
Source of truth: `spec/21-app/backend-implementation-request-v1.md` (accepted)
Companions: `00-index.md` (table of contents), individual `NN-*.md` files (per-diagram notes).

This README embeds every Mermaid diagram in Plan 88 Step 4 in reading order so downstream implementers (Steps 6-15, 30-55, 56-66) have one canonical page to cite. Do not edit the diagrams here; edit the per-file source and re-run Step 5 to refresh embeds.

## 01 - Mode Toggle (`useBackend()`)

Source: [`01-mode-toggle.md`](./01-mode-toggle.md)

<lov-artifact id="backend-v1-diagram-01" type="mermaid">
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

````
</lov-artifact>

## 02 - Request Lifecycle (Envelope + Correlation-ID)

Source: [`02-request-lifecycle.md`](./02-request-lifecycle.md)

<lov-artifact id="backend-v1-diagram-02" type="mermaid">
```mermaid
sequenceDiagram
  autonumber
  participant C as Component
  participant H as useBackend()
  participant TC as HttpBackend (src/lib/backend)
  participant BE as BE FastAPI route
  participant SVC as BE service (Result[T])
  participant FAC as BE/app/facades/<vendor>_facade.py
  participant SDK as sdk/<vendor>/<version>/
  participant LOG as Structured log (41-logging.md)
  participant ES as useErrorStore + GlobalErrorModal

  C->>H: call domain method
  H->>TC: dispatch
  TC->>TC: mint CorrelationId (ULID)
  TC->>BE: HTTP request<br/>X-Correlation-Id: <ulid>
  BE->>BE: pydantic validate input
  BE->>SVC: delegate
  SVC->>FAC: CatConcept wrapper call
  FAC->>SDK: vendor SDK call
  SDK-->>FAC: raw result or vendor error
  FAC-->>SVC: Result[T] (success) or AppError with E_CAM_* / E_SDK_*
  SVC-->>BE: Result[T]
  BE->>LOG: {requestId, correlationId, method, path, httpCode, errorCode, durMs}

  alt success
    BE-->>TC: 200 { Status:{IsSuccess:true, HttpCode:200}, Attributes:{CorrelationId}, Results:[...] }
    TC-->>H: Results
    H-->>C: typed data
  else failure
    BE-->>TC: 4xx/5xx { Status:{IsSuccess:false, HttpCode, Message},<br/>Attributes:{ Error:{Code:E_BE_*, Message, Context, CausedBy}, CorrelationId }, Results:[] }
    TC->>ES: lookupErrorCode(Attributes.Error.Code) + push
    ES-->>C: banner + "View Details" -> GlobalErrorModal
  end
````

</lov-artifact>

## 03 - SDK Facade Layers (import boundaries)

Source: [`03-sdk-facade-layers.md`](./03-sdk-facade-layers.md)

<lov-artifact id="backend-v1-diagram-03" type="mermaid">
```mermaid
flowchart LR
  subgraph FE[Frontend / TanStack Start]
    COMP[Components + routes]
    HK[useBackend hook]
    TC[src/lib/backend]
    FEFAC[src/lib/facades/<Vendor>Facade.ts]
    FEDOM[src/lib/domain/Cat<Concept>.ts]
    SDKBROWSER[sdk/<vendor>/<ver>/browser bits]
  end

subgraph BE[Backend / FastAPI]
ROUTE[BE/app/routes/_]
SVC[BE/app/services/_]
REPO[BE/app/repos/*]
BEFAC[BE/app/facades/<vendor>_facade.py]
BEDOM[BE/app/domain/cat_<concept>.py]
SDKNATIVE[sdk/<vendor>/<ver>/native bits]
end

COMP --> HK --> TC --> FEDOM --> FEFAC --> SDKBROWSER
TC -.HTTP.-> ROUTE --> SVC --> REPO
SVC --> BEDOM --> BEFAC --> SDKNATIVE

COMP -. forbidden .-x SDKBROWSER
HK -. forbidden .-x SDKBROWSER
TC -. forbidden .-x SDKBROWSER
ROUTE-. forbidden .-x SDKNATIVE
SVC -. forbidden .-x SDKNATIVE
REPO -. forbidden .-x SDKNATIVE

classDef forbidden stroke:#c00,stroke-dasharray:4 3,color:#c00

````
</lov-artifact>

## 04 - Error Propagation

Source: [`04-error-propagation.md`](./04-error-propagation.md)

<lov-artifact id="backend-v1-diagram-04" type="mermaid">
```mermaid
flowchart TD
  Origin{Where did it originate?}
  Origin -- vendor SDK --> FacadeWrap["BE/app/facades/*.py<br/>AppError.wrap(err).with_code(E_SDK_*)<br/>.with_context({vendor, op})"]
  Origin -- domain rule --> DomainRaise["BE/app/domain/cat_*.py<br/>raise AppError(E_CAM_* or E_BE_*)"]
  Origin -- service invariant --> ServiceRaise["BE/app/services/*.py<br/>Result.fail(E_BE_*)"]
  Origin -- security posture --> SecRaise["config layer<br/>raise AppError(E_SEC_UNAPPROVED_EGRESS)"]

  FacadeWrap --> Bubble
  DomainRaise --> Bubble
  ServiceRaise --> Bubble
  SecRaise --> Bubble

  Bubble[Global FastAPI exception handler] --> Envelope["envelope.fail(appError)<br/>{ Status:{IsSuccess:false, HttpCode, Message},<br/>  Attributes:{ Error:{Code, Message, Context, CausedBy}, CorrelationId },<br/>  Results:[] }"]
  Envelope --> Log["41-logging.md line:<br/>{requestId, correlationId, httpCode, errorCode, durMs}"]
  Envelope --> Wire[HTTP response]
  Wire --> TC[HttpBackend client]
  TC --> Lookup["lookupErrorCode(Attributes.Error.Code)"]
  Lookup --> Store[useErrorStore push]
  Store --> Banner[Toast / banner]
  Banner --> Details["GlobalErrorModal<br/>(shows Message, Context, CausedBy; no Stack)"]

  subgraph SilentBan[Silent-swallow ban]
    Caught["catch/except with no log AND no re-raise"] -->|CI + lint| Fail["E_BUG_SILENT_SWALLOW"]
  end
````

</lov-artifact>

## 05 - Launcher Sequence (`run.ps1` / `run.sh`)

Source: [`05-launcher-sequence.md`](./05-launcher-sequence.md)

<lov-artifact id="backend-v1-diagram-05" type="mermaid">
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
</lov-artifact>

```
