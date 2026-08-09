# SS-01 - Manifest (final)

Parent plan: `.lovable/plans/pending/16-rule-bundle-import-export-spec.md`
Parent spec: `spec/21-app/70-rule-bundle-import-export.md` §70.4

## Field table

| Field                  | Type   | Required  | Constraint                                          |
| ---------------------- | ------ | --------- | --------------------------------------------------- |
| `schemaVersion`        | int    | yes       | `>= 1`, `<= currentSupported`                       |
| `bundleId`             | string | yes       | UUIDv4 lowercase                                    |
| `format`               | string | yes       | `BundleFormatSqlite` \| `BundleFormatJson`          |
| `createdAt`            | string | yes       | ISO8601 UTC, `Z` suffix, second precision           |
| `producer.appVersion`  | string | yes       | SemVer of producing app build                       |
| `producer.machineHash` | string | no        | lowercase hex, `<= 64` chars, salted+hashed         |
| `ruleCount`            | int    | yes       | `>= 0`, must equal payload row count                |
| `imageCount`           | int    | yes       | `>= 0`, must equal `/assets/images/*` count         |
| `checksum.algorithm`   | string | yes       | fixed `Sha256`                                      |
| `checksum.payloadHex`  | string | yes       | lowercase hex SHA-256 of uncompressed payload bytes |
| `origin`               | string | yes       | `Local` \| `CloudCatalog`                           |
| `signature.algorithm`  | string | iff cloud | fixed `Ed25519`                                     |
| `signature.keyId`      | string | iff cloud | opaque lowercase hex                                |
| `signature.signedAt`   | string | iff cloud | ISO8601 UTC `Z`                                     |

## Encoding

- UTF-8, no BOM, LF line endings.
- Canonical JSON: sorted object keys, no trailing commas, no non-significant whitespace variation across producers.
- Non-canonical form rejects with `BundleInvalidError(ManifestNotCanonical)`.

## Error taxonomy for manifest validation

- `BundleInvalidError(ManifestJson)` - parse failure.
- `BundleInvalidError(ManifestUnknownField)` - unknown top-level key.
- `BundleInvalidError(FormatValue)` - `format` outside the enum.
- `BundleInvalidError(ChecksumAlgorithm)` - algorithm != `Sha256`.
- `BundleInvalidError(SignaturePresence)` - `signature` / `/signature.sig` presence disagrees with `origin`.
- `BundleInvalidError(ManifestNotCanonical)` - non-canonical JSON form.
- `BundleChecksumMismatchError(Payload)` - payload hash mismatch.
- `BundleChecksumMismatchError(AssetHash)` - image asset filename does not match its SHA-256.

Status: final for Plan 16 Step 4. Signature verification detail lives in §70.11 (Step 11); manifest itself only carries envelope metadata.
