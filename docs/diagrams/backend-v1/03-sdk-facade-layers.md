# 03 - SDK Facade Layers (import boundaries)

Only four folders may import from `sdk/**`. Anything else violates `E_BUG_SDK_LEAK` and fails the CI grep gate.

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
    ROUTE[BE/app/routes/*]
    SVC[BE/app/services/*]
    REPO[BE/app/repos/*]
    BEFAC[BE/app/facades/<vendor>_facade.py]
    BEDOM[BE/app/domain/cat_<concept>.py]
    SDKNATIVE[sdk/<vendor>/<ver>/native bits]
  end

  COMP --> HK --> TC --> FEDOM --> FEFAC --> SDKBROWSER
  TC -.HTTP.-> ROUTE --> SVC --> REPO
  SVC --> BEDOM --> BEFAC --> SDKNATIVE

  COMP -. forbidden .-x SDKBROWSER
  HK   -. forbidden .-x SDKBROWSER
  TC   -. forbidden .-x SDKBROWSER
  ROUTE-. forbidden .-x SDKNATIVE
  SVC  -. forbidden .-x SDKNATIVE
  REPO -. forbidden .-x SDKNATIVE

  classDef forbidden stroke:#c00,stroke-dasharray:4 3,color:#c00
```

## Rule (locked `52-sdk-facade-pattern.md`)

- Raw SDK drops live at `sdk/<vendor>/<version>/` read-only with a hashed manifest.
- Backend imports `sdk/**` ONLY from `BE/app/facades/<vendor>_facade.py`. Domain callers use `BE/app/domain/cat_<concept>.py` (`Cat<Concept>`).
- Frontend imports `sdk/**` browser bits ONLY from `src/lib/facades/<Vendor>Facade.ts`. Domain callers use `src/lib/domain/Cat<Concept>.ts` (`Cat<Concept>`).
- CI grep gate: `rg -n "from ['\"]sdk/|import .* from ['\"]sdk/"` outside those four paths -> `E_BUG_SDK_LEAK`.
