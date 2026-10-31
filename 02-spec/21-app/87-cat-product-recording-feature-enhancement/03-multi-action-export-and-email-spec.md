# 03 - Multi-Action Export & Direct Email Specification

- **Specification ID**: `SPEC-87-03`
- **Module**: `AppRuntime / BugRecorder / Export`
- **Status**: Verified Specification
- **Date**: 2026-10-31

---

## 1. Executive Summary

This specification defines the expanded 6-action export suite available on both the floating HUD and the review modal:
1. `Export ZIP Bundle`: Downloads ZIP bundle containing session metadata, JSON event timeline, and screenshots.
2. `Copy as Prompt (V6)`: Formats and copies V6 Tree Swarm markdown prompt.
3. `Copy as Prompt (V7)`: Formats and copies V7 Dual-Mode markdown prompt.
4. `Direct Email`: Opens dialog to dispatch email report directly to specified address.
5. `Save to Supabase`: Cloud persistence with 450MB quota check and 14-day auto-pruning.
6. `Save to Local Machine`: Persists to host disk `.logs/recorded-bugs/<session_id>/`.
7. `Copy CLI Command`: Copies `python -m BE.cli.processing.main errors list --session-id <id> --trace`.

---

## 2. Direct Email Dispatch Workflow
- Frontend prompts operator for recipient email address.
- Dispatches payload via loopback `POST /bug-reports`:
  ```json
  {
    "recipient": "engineer@company.com",
    "subject": "CAT Vision Bug Report - <session_id>",
    "markdown": "<v6 or v7 prompt content>",
    "screenshots": [...]
  }
  ```
- Backend queues SMTP or provider delivery and logs result.
