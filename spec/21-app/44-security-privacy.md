# 44 — Security & Privacy

**Status:** Locked (Plan 04 Step 41). Defines the local-first security model, operator consent boundaries, image/data handling rules, and redaction hooks that constrain the optional AI lane (43), exports (38), logs (41), health endpoints (42), and every worker/runtime boundary.

Anchors: 10 (system context), 20 (folder structure), 24 (results JSONL), 27 (config), 38 (results exports), 40 (error management), 41 (logging), 42 (observability), 43 (AI validation stub).

## 1. Security Posture

The v1 app is a **single-machine, local-first inspection workstation**.

Rules:

- No image, result, log, instruction bundle, metric, or database row leaves the host automatically.
- No background network egress is allowed from capture, dispatcher, classical workers, or AI workers.
- External connectivity is opt-in, explicit, and operator-triggered only. Any implicit egress is `E_SEC_UNAPPROVED_EGRESS`.
- Authentication is out of scope for v1 because the target is a local operator station, not a multi-user cloud app. If multi-user auth lands later, roles live in a separate role table, not on profile/user rows.

## 2. Trust Boundaries

| Boundary                        | Trust level                          | Required control                                                   |
| ------------------------------- | ------------------------------------ | ------------------------------------------------------------------ |
| Operator → UI Shell             | trusted human input, still validated | field validation + typed errors (40)                               |
| UI → Supervisor                 | local API, untrusted payload         | schema validation + correlation id                                 |
| Supervisor → Capture/Dispatcher | trusted orchestration                | allowlisted commands only                                          |
| PLC / trigger I/O → Capture     | untrusted physical signal            | debounce + trigger-source validation                               |
| Camera SDK → Capture            | isolated trusted binary              | process isolation + crash containment                              |
| Worker → DB/files               | trusted process, hot path            | one-writer rules + atomic writes                                   |
| Dispatcher → AI subprocess      | untrusted optional lane              | local IPC allowlist + redaction + no verdict authority + no egress |
| App → export file               | operator-controlled                  | explicit destination + manifest                                    |

Any boundary that accepts data without validation is `E_SEC_BOUNDARY_UNVALIDATED`.

## 3. Data Classification

| Class              | Examples                           | Storage                     | Logging                 |
| ------------------ | ---------------------------------- | --------------------------- | ----------------------- |
| `InspectionImage`  | raw/processed frame files          | local task folder only      | path + size only        |
| `InspectionResult` | `Result`, `Judgment`, verdicts     | `task.db` + `results.jsonl` | ids/counts/verdict only |
| `InstructionData`  | regions, rules, tolerance profiles | `rules.db` + snapshots      | ids/hash only           |
| `OperationalLog`   | JSON log lines                     | local logs                  | already redacted        |
| `OperatorSetting`  | config and audit entries           | root/task DB                | key + old/new summary   |
| `SecretMaterial`   | tokens, passwords, API keys        | not stored in v1 domain DB  | never logged            |

Raw image bytes and full DB rows are never written to logs. Violations are `E_LOG_SECRET_LEAK` when secret-shaped and `E_SEC_IMAGE_LOGGED` when image-shaped.

## 4. Image Retention & Access

- Image files remain under the owning `TaskId` folder defined by 20 and 25.
- Processed/failed retention follows 27 (`storage.processedRetentionDays`, `storage.failedRetentionDays`).
- Delete jobs must remove image files, detail sidecars, and stale export bundles together; partial cleanup is `E_SEC_RETENTION_PARTIAL`.
- Screens may display images from `processed/` or `failed/`, but must not embed image bytes into `results.jsonl`, logs, metrics, or exported CSV.
- Image access outside the owning task folder is `E_SEC_PATH_ESCAPE`.

## 5. Operator Consent

Consent is required before any data leaves the host.

Consent record fields:

```json
{
  "ConsentId": "01J...ULID",
  "TaskId": "01J...ULID",
  "RunSessionId": "01J...ULID | null",
  "Purpose": "AI_REVIEW | EXPORT | SUPPORT_BUNDLE",
  "DataClasses": ["InspectionImage", "InspectionResult"],
  "Destination": "local-path | provider-id",
  "GrantedBy": "operator",
  "GrantedAt": "2026-07-12T00:00:00.000Z"
}
```

Rules:

- Consent is purpose-specific; `EXPORT` consent does not authorize `AI_REVIEW`.
- Consent is per action, not a permanent toggle.
- Missing consent is `E_SEC_CONSENT_MISSING`.
- Reusing an old consent record for a new destination is `E_SEC_CONSENT_REUSED`.

## 6. AI Redaction Hooks

Before any future AI subprocess receives an image, the dispatcher runs the redaction pipeline defined by Q-06:

1. Load the exact image referenced by the `Result.ImageFilePath`.
2. Load the Instruction Bundle (36) by `InstructionId`.
3. Apply configured masks from rule/region metadata.
4. Strip file metadata (EXIF, camera serial if embedded).
5. Emit a redacted temporary image with a new hash.
6. Send only `{InstructionId, SourceHash, RedactedImagePath, CorrelationId}` over local IPC to the isolated AI subprocess.
7. Log only ids, byte size, and hash prefix.

The original image is never modified and its raw path is never sent to the AI subprocess. Sending an unredacted image when redaction is configured is `E_SEC_REDACTION_BYPASSED`. Redaction failure blocks the AI opinion only; it never blocks classical `Result` emission, matching 43.

## 7. Secrets & Config

- v1 domain config (27) must not contain API keys or credentials.
- If a future provider needs credentials, the app stores only a secret reference key, never the secret value.
- `.env` values are not part of v1 operational config and must not be mirrored into `root.db` or logs.
- Any config export must redact keys matching the logger redaction rule in 41.

Persisting a secret into any inspection DB is `E_SEC_SECRET_PERSISTED`.

## 8. Local API & Health Endpoints

- Local UI APIs validate input schemas and emit typed errors per 40.
- Public health endpoints from 42 return only liveness/readiness booleans and failing sub-check names.
- Health endpoints never return paths, DB rows, hostnames, image names, operator names, stack traces, or config dumps.
- Returning sensitive diagnostic detail from a health endpoint is `E_SEC_HEALTH_LEAK`.

## 9. Export & Support Bundles

Exports are operator-triggered from 38 and must include a manifest:

```json
{
  "BundleId": "01J...ULID",
  "TaskId": "01J...ULID",
  "RunSessionId": "01J...ULID",
  "CreatedAt": "2026-07-12T00:00:00.000Z",
  "IncludedClasses": ["InspectionResult", "InstructionData"],
  "ImageCount": 0,
  "RedactionApplied": true,
  "SourceHash": "sha256:..."
}
```

Rules:

- CSV exports include scalar result data only.
- Evidence bundles may include images only when the operator explicitly selects that option.
- Bundles are written to a local path chosen by the operator; no automatic upload.
- Bundle creation writes an audit log line with `ConsentId`.

## 10. Audit Events

Security-relevant actions emit an `INFO` log with `Code = I_AUDIT_*` and a typed context:

- `I_AUDIT_EXPORT_CREATED`
- `I_AUDIT_CONSENT_GRANTED`
- `I_AUDIT_SETTINGS_CHANGED`
- `I_AUDIT_AI_REVIEW_REQUESTED`
- `I_AUDIT_RETENTION_DELETE`

Audit logs include ids, counts, purpose, and destination class. They never include raw paths outside the install root, image bytes, secrets, or full row dumps.

## 11. Failure Taxonomy (security-local)

| Code                         | When                                                          |
| ---------------------------- | ------------------------------------------------------------- |
| `E_SEC_UNAPPROVED_EGRESS`    | Any automatic or non-consented outbound data transfer.        |
| `E_SEC_BOUNDARY_UNVALIDATED` | API/IPC boundary accepts payload without schema validation.   |
| `E_SEC_IMAGE_LOGGED`         | Raw image bytes or image-derived large blobs written to logs. |
| `E_SEC_RETENTION_PARTIAL`    | Retention cleanup deletes only part of a result/image set.    |
| `E_SEC_PATH_ESCAPE`          | File access resolves outside the owning task/install root.    |
| `E_SEC_CONSENT_MISSING`      | Export/AI/support action attempted without consent.           |
| `E_SEC_CONSENT_REUSED`       | Consent reused for a different action or destination.         |
| `E_SEC_REDACTION_BYPASSED`   | Image sent to AI/support without required redaction.          |
| `E_SEC_SECRET_PERSISTED`     | Secret value stored in inspection DB/config/export.           |
| `E_SEC_HEALTH_LEAK`          | Health endpoint returns sensitive diagnostic detail.          |

## 12. Cross-References

- Data egress default: 10 §Data Egress.
- Result/export source data: 24 and 38.
- Config ownership: 27.
- Error/log contracts: 40 and 41.
- Metrics/health: 42.
- AI isolation and no-egress rule: 43.

## 7. Health Token Management (LOCKED — resolves Q-10)

Anchor for the bearer-token rule in 42 §7.

- The token lives at `27.Obs.HealthToken` — a URL-safe base64 string ≥ 32 bytes of CSPRNG entropy. Values shorter than 32 bytes are `E_SEC_HEALTH_TOKEN_WEAK`.
- The token is stored in the `SecretMaterial` class (§3): never logged, never emitted in metrics, never included in export bundles, never returned by any endpoint including `/health/ready`. Leakage is `E_LOG_SECRET_LEAK`.
- **Rotation:** operator regenerates via the Settings screen (39). Both `Old` and `New` tokens are accepted for a grace window of `27.Obs.HealthTokenGraceSec` (default `300`); after grace expiry, only `New` is valid. The dispatcher emits `I_HEALTH_TOKEN_ROTATED` at rotation and `I_HEALTH_TOKEN_GRACE_EXPIRED` at cutover; overlapping validity without those markers is `E_SEC_HEALTH_TOKEN_ROTATION_SILENT`.
- Comparison is timing-safe (see 42 §7); repeated `E_HEALTH_UNAUTHORIZED` from the same source IP at a rate above `27.Obs.HealthAuthFailPerMin` (default `30`) trips `W_SEC_HEALTH_BRUTE_FORCE` — v1 warns only, does not lock out (single-operator posture, §1).
- Consent (§5) is NOT required for `/health/ready` — health data is operational, not `InspectionImage`/`InspectionResult`, and the bearer token itself is the authorization record.

Failure modes added by this section:

| Code                                 | Meaning                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| `E_SEC_HEALTH_TOKEN_WEAK`            | Configured `Obs.HealthToken` below entropy floor.                                    |
| `E_SEC_HEALTH_TOKEN_ROTATION_SILENT` | Rotation happened without `I_HEALTH_TOKEN_ROTATED` / `I_HEALTH_TOKEN_GRACE_EXPIRED`. |
| `E_SEC_TIMING_UNSAFE_COMPARE`        | Health token compared with non-timing-safe operator.                                 |

## Acceptance Checklist

- [ ] Every table with PII cites RLS + GRANT policies per `.lovable/coding-guidelines.md`.
- [ ] Secrets are never logged; `41-logging.md` redaction rule cited.
- [ ] Role model resolves to `public.user_roles` + `has_role()` per user-roles memory.
