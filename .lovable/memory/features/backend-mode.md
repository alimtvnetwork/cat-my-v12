# Backend Mode

Describes the toggle behavior and storage keys for backend mode.

## Storage Keys

- `ui.backend.baseUrl`: Stores the target backend URL (default: `http://127.0.0.1:8787`).

## Toggle Behavior

The application relies on `useBackendMode` store to swap between mocked UI seed data and live backend interactions.
