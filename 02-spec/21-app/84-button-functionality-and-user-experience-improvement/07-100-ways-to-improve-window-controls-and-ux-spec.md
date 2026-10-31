# 07 - 100 Ways to Improve Window Controls and User Experience

This catalog details 100 concrete, actionable improvements across window management, loading experience, error telemetry, launcher stability, and terminal UX.

---

## 1. Startup & Pre-Hydration Loading (1-20)
1. Embed zero-latency HTML/CSS splash container inside initial document body.
2. Render Cat Vision SVG logo immediately with fixed width/height to avoid layout shifts.
3. Display dual-ring industrial spinner with hardware-accelerated CSS transform.
4. Showcase dynamic application version badge matching `version.json`.
5. Add glowing ambient backdrop gradient in dark obsidian and cyan tokens.
6. Provide high-contrast fallback typography (`system-ui`, `IBM Plex Mono`).
7. Implement smooth 250ms CSS opacity transition upon React mount.
8. Unmount splash DOM node entirely after fade-out to conserve GPU memory.
9. Display real-time status microcopy ("Connecting to HMI runtime…").
10. Add fallback dismissal timer (5s safety timeout) if React boot hangs.
11. Support theme-aware splash background conforming to user preference.
12. Preload primary web fonts in `<head>` to prevent Flash of Unstyled Text.
13. Inline critical CSS styles within `<style>` tag to eliminate external request latency.
14. Ensure zero cumulative layout shift (CLS = 0.0) during splash unmount.
15. Add subtle pulsing status dot indicating active WebSocket heartbeat probe.
16. Disable user text selection on splash screen elements (`user-select: none`).
17. Support keyboard accessibility (focus traps bypass splash overlay).
18. Render loading progress bar if backend probe takes >1000ms.
19. Display diagnostic error banner on splash if backend port is unreachable.
20. Emit performance timing mark (`performance.mark('hmi:splash:dismissed')`).

---

## 2. Window Controls & Titlebar Usability (21-40)
21. Replace `--start-fullscreen` with `--start-maximized` in launcher scripts.
22. Eliminate HTML5 `requestFullscreen()` call that triggers the Esc security prompt.
23. Wire native Win32 `SW_MINIMIZE` and `SW_FORCEMINIMIZE` via loopback API.
24. Wire native Win32 `SW_MAXIMIZE` and `SW_RESTORE` toggling via `IsZoomed`.
25. Synchronize titlebar maximize icon (`Square` vs `Copy`) with native window zoom state.
26. Resolve target window HWND deterministically via Chromium PID matching.
27. Validate HWND geometry (`width > 400`, `height > 300`) to avoid background helper windows.
28. Provide instant hover state styling with industrial dark palette borders.
29. Add active press feedback (`active:scale-95`) on all three titlebar buttons.
30. Decorate all window controls with automation triad (`Id`, `Name`, `XPath`).
31. Increase button hit targets to standard 32x32px minimum for touch HMI screens.
32. Provide clear, accessible tooltips ("Minimize to taskbar", "Restore / Maximize", "Close").
33. Support keyboard shortcut `Alt+F4` and `Esc` handling on exit modal.
34. Prevent double-click accidental closure with debounce guard.
35. Render distinct red danger hover accent on close button (`hover:bg-rose-600`).
36. Add non-intrusive sound / haptic feedback hook on window control interactions.
37. Display subtle warning dialog if inspection run or bug recording is active.
38. Ensure window drag handles do not overlap control button bounding boxes.
39. Persist window maximized / restored preference in UI settings store.
40. Gracefully handle multi-monitor display switching without losing window position.

---

## 3. Teardown Speed & Process Lifecycle (41-60)
41. Parallelize window close message dispatch with backend shutdown trigger.
42. Replace slow `powershell.exe` child process in backend with instant `taskkill /F /PID`.
43. Reduce backend shutdown timer delay to 50ms for immediate process exit.
44. Lower launcher supervision loop sleep from 800ms to 150ms for instant lifecycle detection.
45. Ensure launcher cleans up all Vite and Uvicorn child processes on browser window close.
46. Handle SIGINT (`Ctrl+C`) and SIGTERM gracefully in Python and PowerShell.
47. Prevent orphaned Chrome/Edge background processes by binding to `--user-data-dir`.
48. Discard stale lock files in `.browser-profile` prior to launch.
49. Terminate lingering Python uvicorn instances on port 8787 before binding.
50. Terminate lingering Bun / Node instances on port 5173 before binding.
51. Send `WM_CLOSE (0x0010)` to window message loop before forceful process kill.
52. Flush in-memory SQLite transactions before closing database handles.
53. Close active WebSocket connections cleanly before process exit.
54. Cancel pending asynchronous HTTP requests via `AbortController`.
55. Remove temporary camera frame buffers on teardown.
56. Log total process shutdown elapsed duration in milliseconds.
57. Invalidate active session locks in Task-DB on shutdown.
58. Prevent duplicate exit modal open events.
59. Auto-dismiss exit confirmation if user switches windows.
60. Clean up IPC mailboxes on exit.

---

## 4. Audit Logging & Stack Trace Telemetry (61-80)
61. Remove all silent `.catch(() => {})` blocks across frontend control components.
62. Capture full JavaScript Error stack traces in `useErrorStore`.
63. Emit structured audit events (`correlationId`, `timestamp`, `action`, `component`).
64. Write backend window control failures into Root-DB `system_errors` table.
65. Record Python `traceback.format_exc()` on any Win32 API failure.
66. Include candidate HWND list and matched PID in backend audit logs.
67. Emit structured JSON logs with `CorrelationId` and `operation` tags.
68. Expose `/api/system/errors` endpoint for retrieving window management telemetry.
69. Surface toast notifications to operators when a window action cannot be fulfilled.
70. Track frontend-to-backend RPC round-trip latency for window endpoints.
71. Log browser user-agent and OS version string on application bootstrap.
72. Audit user confirmation dialog actions (Confirm Exit vs Cancel).
73. Record unhandled promise rejections into local error buffer.
74. Implement correlation ID propagation from frontend HTTP request headers.
75. Maintain rotating diagnostic log file for launcher events (`.logs/launcher.log`).
76. Record timestamped lifecycle milestones in SQLite Split-DB.
77. Exclude sensitive data from error stack trace dumps.
78. Provide one-click "Copy Stack Trace" in operator bug report modal.
79. Integrate window action telemetry with HMI breadcrumb recorder.
80. Validate Win32 `GetLastError()` return codes and format human-readable messages.

---

## 5. Launcher Stability & Terminal Output Polish (81-100)
81. Suppress raw JSON serialization dumps in PowerShell terminal output.
82. Format all launcher steps with uniform two-space indentation and 12-char column padding.
83. Use high-visibility ANSI symbols (`✓`, `⚡`, `●`, `⚠`, `↓`) with color styling.
84. Verify PowerShell syntax across all versions (Windows PowerShell 5.1 & PowerShell 7+).
85. Enforce clean UTF-8 encoding with a single BOM signature to prevent parse failures.
86. Redirect backend uvicorn and vite stdout/stderr cleanly to `.logs/` directory.
87. Tail `.logs/backend.stderr.log` only when an abnormal startup failure occurs.
88. Validate port availability (`Test-NetConnection`) before initiating server spawn.
89. Check for Bun and UV installations with actionable installation hints if missing.
90. Automatically package chromium extension (`Compress-Archive`) only when files change.
91. Detect existing running browser window (`--app`) to prevent redundant instances.
92. Support `-NoShell` parameter for headless server testing and CI environments.
93. Support custom port overrides (`-BePort`, `-FePort`, `-HostIp`).
94. Display active Git branch and application version in launch banner.
95. Print clean separator lines (`DivLine`) matching terminal window width.
96. Display helpful keyboard shortcuts in supervision status footer.
97. Prevent PowerShell script termination when individual non-critical commands fail.
98. Clear terminal screen optionally via `-Clear` switch.
99. Ensure graceful error trapping with `try { ... } finally { ... }` blocks.
100. Return exit code 0 on clean shutdown and non-zero on preflight abort.
