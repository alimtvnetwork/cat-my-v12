# Supply chain

Status: Draft (Plan 28)

## SBOM

- Format: CycloneDX JSON.
- Generated per artifact by CI; attached to release as `sbom-<version>-<os>.cdx.json`.
- Includes: Node deps (from lockfile), Python deps (from `requirements.txt`
  with hashes), Rust deps (from `Cargo.lock`), bundled binaries.

## Dependency pinning

- `bun.lockb`, `Cargo.lock`, `requirements.txt` with pinned hashes committed.
- No range specifiers in production dep manifests.
- Renovate/Dependabot PRs require passing full CI matrix.

## Vendored binaries policy

- No vendored native binaries in-repo except when upstream does not publish
  reproducible builds; each exception documented in `24-open-questions.md`
  with a removal plan.

## License inventory

- CI emits `licenses-<version>.json` per artifact.
- Reject GPL/AGPL in production deps unless explicitly waived.
- User-visible attribution page rendered from the inventory at `settings.about`.

## Signature attestation

- Each artifact attested via Sigstore Cosign; `.sig` published alongside.
- Verification instructions in `readme.md` (see `10-code-signing.md`).
