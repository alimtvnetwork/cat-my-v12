# 04 - Error Propagation

How an `AppError` originates, embeds into the envelope, and reaches the user.

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
```

## Code families reserved for Plan 88

- `E_BE_*` - backend HTTP / service invariants (e.g. `E_BE_INVALID_BASE_URL`, `E_BE_TIMEOUT`).
- `E_CAM_*` - camera facade domain errors.
- `E_SDK_*` - vendor SDK adapter errors.
- `E_SEC_*` - security posture (e.g. `E_SEC_UNAPPROVED_EGRESS`).
- `E_BUG_*` - developer-error class (silent swallow, sdk leak, etc.).

Numeric `BE-4xxx` / `CAM-10xx` ranges are RETIRED.
