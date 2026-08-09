"""Plan 20 Step 7: audit-side rotation worker package.

Split off from `app.core.security.retention` (which stays as the
legacy single-horizon pruner) so the multi-policy worker contract
locked in `spec/21-app/71-audit-retention.md` §71.3 owns its own
module namespace.
"""
