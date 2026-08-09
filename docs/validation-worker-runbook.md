# Validation Worker: Deploy and Secret Rotation Runbook

This runbook covers deploying the Python validation worker and rotating
`VALIDATION_WORKER_URL` / `VALIDATION_WORKER_TOKEN` without dropping
in-flight validations.

Referenced code:

- `src/lib/editor/validation.functions.ts` (`scoreRulesRemote` server fn)
- `worker/app.py`, `worker/Dockerfile`, `worker/fly.toml`, `worker/deploy.sh`

## 1. Deploy from scratch

1. Install `flyctl` and run `fly auth login`.
2. Pick an app name (used as the Fly subdomain). Example:
   `control-automation-validator`.
3. Generate a bearer token, do NOT reuse tokens across environments:
   ```
   openssl rand -hex 32
   ```
   Save it in your password manager. You will paste it twice below.
4. Deploy:
   ```
   VALIDATION_WORKER_TOKEN=<hex-token> ./worker/deploy.sh <app-name>
   ```
   The script creates the Fly app if missing, sets the token as a Fly
   secret (so the container reads `VALIDATION_WORKER_TOKEN` at runtime),
   deploys the image, and prints the public HTTPS URL.
5. Health check the URL:
   ```
   curl https://<app-name>.fly.dev/healthz
   ```
   Expect `{"ok":true,"engine":"stub-opencv","version":"0.1.0"}`.
6. In Lovable Cloud, open Cloud > Secrets and set BOTH:
   - `VALIDATION_WORKER_URL` = `https://<app-name>.fly.dev`
   - `VALIDATION_WORKER_TOKEN` = the same hex token from step 3
     The settings UI validates the URL against `^https?://`; a missing
     scheme is the usual cause of a silent save rejection.
7. Trigger a validation from the editor and confirm the server log
   `[validation.functions] worker ok` fires with `engine=stub-opencv`.

## 2. Rotate the bearer token (routine, quarterly or on suspicion)

Goal: no downtime and no unauthenticated requests hitting the worker.

1. Generate a new token: `openssl rand -hex 32`.
2. On the worker, set BOTH the old and the new token so either is
   accepted for the short window it takes to update Lovable Cloud. The
   stock `app.py` only supports one token, so switch to the dual-token
   variant temporarily:
   ```
   flyctl secrets set --app <app-name> \
     VALIDATION_WORKER_TOKEN=<new> \
     VALIDATION_WORKER_TOKEN_PREV=<old>
   ```
   If you have not yet added `VALIDATION_WORKER_TOKEN_PREV` support in
   `worker/app.py`, do this instead: deploy a second Fly app with the new
   token, cut over the URL, and retire the old app after step 4.
3. In Lovable Cloud > Secrets, update `VALIDATION_WORKER_TOKEN` to the
   new value and save. Redeploy the app so the server function picks up
   the new env value.
4. Watch server logs (`stack_modern--server-function-logs`) for
   `worker non-2xx` with `status: 401`. Zero 401s for 15 minutes means
   every client is on the new token.
5. On the worker, unset the old token:
   ```
   flyctl secrets unset --app <app-name> VALIDATION_WORKER_TOKEN_PREV
   ```

## 3. Rotate the worker URL (moving hosts, new region, custom domain)

1. Deploy the new worker to the new URL. Verify `/healthz`.
2. Copy `VALIDATION_WORKER_TOKEN` to the new worker's secrets.
3. In Lovable Cloud > Secrets, update `VALIDATION_WORKER_URL` to the new
   HTTPS URL. Save. Redeploy.
4. Confirm one live validation succeeds against the new URL (grep
   `[validation.functions] worker ok`).
5. Retire the old worker: `flyctl apps destroy <old-app>` after 24 h.

## 4. Emergency: worker is compromised

1. Immediately `flyctl scale count 0 --app <app-name>` to stop it
   answering requests.
2. Rotate the token (section 2 steps 1 and 3). The compromised token is
   now invalid.
3. Redeploy the worker with a rebuilt image and the new token:
   `./worker/deploy.sh <app-name>`.
4. Scan for unexpected `worker ok` log entries in the window before
   detection; those requests may have leaked image data.

## 5. Local development

Point `VALIDATION_WORKER_URL` at `http://localhost:8787` and run:

```
cd worker
VALIDATION_WORKER_TOKEN=dev-token uvicorn app:app --port 8787 --reload
```

Never ship a project with `VALIDATION_WORKER_URL` set to a localhost
value. `scoreRulesRemote` will succeed in dev and fail in production
with `worker fetch failed`.

## 6. Failure modes and their signals

| Symptom                                            | Likely cause                                           | Fix                                 |
| -------------------------------------------------- | ------------------------------------------------------ | ----------------------------------- |
| Chip stays `pending` forever                       | Server fn threw at module load                         | Check Cloud > Edge Functions logs   |
| `VALIDATION_WORKER_URL is not set`                 | Secret missing or misspelled                           | Re-add in Cloud > Secrets, redeploy |
| `Validation worker unreachable`                    | Worker down or wrong host                              | `curl /healthz`; restart Fly app    |
| `worker returned 401`                              | Token drift between client and worker                  | Section 2                           |
| `worker payload did not match the expected schema` | Worker returned unexpected JSON, or old worker version | Redeploy worker                     |
| URL save rejected in UI                            | Missing `http(s)://` scheme                            | Include the full URL                |

## 7. Staging-to-prod redeploy checklist

Every worker change ships through staging first. Use this checklist as the
PR merge gate: paste it into the release ticket and tick each box.

Prereqs:

- Two Fly apps exist: `control-automation-validator-staging` and
  `control-automation-validator` (production). Both have
  `VALIDATION_WORKER_TOKEN` set (independent values, never shared).
- Local `flyctl` is authenticated (`fly auth whoami`).

### 7.1 Deploy to staging

1. Bump `WORKER_VERSION` in `worker/fly.staging.toml` (e.g.
   `0.1.1-staging`) and in `worker/app.py`'s `VERSION` constant if it is
   read from env, so `/healthz` reflects the new build.
2. Deploy:
   ```
   ./worker/deploy.sh --env staging control-automation-validator-staging
   ```
   The script fails hard if `/healthz` does not return `ok:true` with the
   expected `WORKER_VERSION`. Do not proceed on a soft failure.
3. Run the calibration harness against the staging URL:
   ```
   VALIDATION_WORKER_URL=https://control-automation-validator-staging.fly.dev \
   VALIDATION_WORKER_TOKEN=<staging-token> \
     python worker/calibrate.py
   ```
   Compare F1 per kind against `worker/calibration-report.json`. Any drop
   greater than 0.02 blocks promotion.
4. Point a scratch Lovable Cloud preview at the staging URL and run one
   end-to-end validation from the editor. Confirm the server log
   `[validation.functions] worker ok` fires with the new
   `engine`/`version`.

### 7.2 Promote to prod

Only after 7.1 is green.

1. Update `WORKER_VERSION` in `worker/fly.toml` to the same base version
   without the `-staging` suffix (e.g. `0.1.1`).
2. Deploy:
   ```
   ./worker/deploy.sh --env prod control-automation-validator
   ```
   Post-deploy smoke check must pass. If it fails, the previous machine
   is still serving traffic (Fly rolling deploy), so no user impact yet.
3. Verify from outside the deploy host:
   ```
   curl -fsS https://control-automation-validator.fly.dev/healthz
   ```
   Confirm `version` matches `WORKER_VERSION` from `fly.toml`.
4. Trigger one live validation from the published app. Watch
   `stack_modern--server-function-logs` for `worker ok` with the new
   version. Zero `worker non-2xx`, `WORKER_TIMEOUT`, or
   `WORKER_SCHEMA_MISMATCH` in the next 5 minutes.
5. Tag the release: `git tag worker-v<version>`.

### 7.3 Rollback

If step 7.2 verification fails or error rate spikes within 30 minutes:

1. `flyctl releases --app control-automation-validator` to list prior
   image versions.
2. `flyctl deploy --app control-automation-validator --image <prior>` to
   redeploy the previous image. `/healthz` returns to the prior
   `WORKER_VERSION`.
3. File a follow-up: what broke, why staging did not catch it, and which
   fixture the calibration harness should have covered.

### 7.4 Secret rotation during a release

Do NOT rotate `VALIDATION_WORKER_TOKEN` in the same window as a version
bump. If both are needed:

1. Ship the version bump through 7.1 and 7.2 first. Stabilise for at
   least one hour.
2. Rotate the token per section 2.

Rotating and redeploying together doubles the surface area of `worker
non-2xx` alerts and makes it impossible to attribute a 401 spike to the
correct cause.
