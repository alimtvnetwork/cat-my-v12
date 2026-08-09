# Code signing and notarization

Status: Draft (Plan 28)

## Windows (Authenticode)

- Cert: EV code-signing cert stored in CI HSM.
- Tool: `signtool.exe sign /tr http://timestamp.digicert.com /td sha256 /fd sha256`.
- Applied to: `worker.exe`, `ControlAutomation.exe`, `.msi`.
- CI secret: `WIN_SIGN_CERT_THUMBPRINT`.

## macOS (Developer ID + notarization)

- Cert: Developer ID Application + Developer ID Installer, stored in Apple Developer account.
- Sign order: worker binary → embedded frameworks → app bundle → `.dmg`.
- Notarize: `xcrun notarytool submit --wait`; staple with `xcrun stapler staple`.
- Hardened runtime enabled; entitlements limited to camera + file access.
- CI secrets: `APPLE_ID`, `APPLE_TEAM_ID`, `APPLE_APP_PASSWORD` (app-specific).

## Linux (GPG detached signatures)

- Cert: project GPG key, fingerprint published in `readme.md`.
- Sign: `gpg --detach-sign --armor <artifact>` producing `.asc` alongside.
- Verify: publish public key + `sha256sums.asc`.
- CI secret: `GPG_SIGNING_KEY` (armored, passphrase in `GPG_PASSPHRASE`).

## Key custody

- All signing keys held in CI enclave; no laptop signing.
- Rotation policy: annual for GPG, on Apple/EV cert expiry.
- Compromise procedure: revoke, re-issue, publish rotation notice, sign next
  release with new key, keep old key on revocation list.

## Verification (user-facing)

- Windows: SmartScreen shows verified publisher.
- macOS: Gatekeeper accepts without warning post-notarization.
- Linux: README documents `gpg --verify` and `sha256sum -c` commands.
