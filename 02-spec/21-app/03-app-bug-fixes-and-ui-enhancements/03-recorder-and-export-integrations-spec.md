# Recorder & Multi-Destination Export Specification
# Directory: 02-spec/21-app/03-app-bug-fixes-and-ui-enhancements/03-recorder-and-export-integrations-spec.md
# Status: draft

## 1. Scoped Application Snapshots
- **In-App Canvas Scoping**: `html2canvas` / rasterizer anchors strictly to `[data-app-root]` (the application container), excluding OS taskbars or outer window framing.
- **Full Screen Toggle**: Provide a checkbox in the recorder HUD allowing the operator to toggle between "Application Only" and "Full Window Display".
- **Default Click-Triggered Snapshots**: Every click event registered by the activity recorder automatically captures a 60% quality JPEG thumbnail (`image/jpeg`, quality 0.6) attached to that event entry, ensuring visual state telemetry without memory bloat.

## 2. Multi-Channel Export Architecture
In the `Export ZIP` modal, provide 3 destination tabs / options:
1. **Export as ZIP Archive**: Downloads the complete diagnostic bundle (`report.json`, logs, screenshots).
2. **Send via Email**: Form inputs for `Recipient Email` with pre-filled support address and subject line; sends diagnostic summary and attachments.
3. **Send to Telegram Chat**:
   - Integrates with the Telegram Bot API (`sendMessage`, `sendDocument`).
   - Settings dialog: `Bot Token`, `Chat ID`, and `Target Channel`.
   - Allows operators and testers to dispatch reproducible bug packages straight to the team lead's Telegram chat with a single click.

## 3. Project Runtime Log Capture
- Guarantee that upon opening any project, client-side console errors, network IPC errors, and rule evaluation logs are piped directly into the active recording session timeline.
