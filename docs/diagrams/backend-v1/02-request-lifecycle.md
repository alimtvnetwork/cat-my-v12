# 02 - Request Lifecycle (Envelope + Correlation-ID)

End-to-end shape for one FE call reaching a BE route, hitting a vendor SDK via the facade, and returning through the envelope.

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
```

## Invariants

- Envelope keys PascalCase always: `Status`, `Attributes`, `Results`.
- `AppError` on the wire: `{Code, Message, Context, CausedBy}`. No `Stack` on the wire; dev stack lives in server logs, 40 frames max, redacted.
- One level of `CausedBy` only.
- `X-Correlation-Id` MUST be echoed in the response headers AND logged.
