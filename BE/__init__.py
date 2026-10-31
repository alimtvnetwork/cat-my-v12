"""BE: Control Automation public HTTP surface.

See 02-spec/21-app/backend-implementation-request-v1.md and Plan 88 (D-001).
Skeleton per SS-02; modules land in Steps 9-27.
"""

# Canonical app version (spec 55). version.json at the repo root is the
# source of truth for the frontend (imported at build time), but the
# installed package ships no version.json, so the backend carries the
# same value literally. Bump both together: version.json AND this line.
# Served by GET /meta and used as the FastAPI version field.
__version__ = "4.113.9"
