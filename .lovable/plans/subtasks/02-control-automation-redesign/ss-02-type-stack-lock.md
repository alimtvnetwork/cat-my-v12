# SS-02 — Type Stack Lock

**Decision:** system-ui stack, no remote fonts. Locked 2026-07-09.

```
font-family: system-ui, -apple-system, "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif;
font-feature-settings: "tnum" 1, "cv11" 1;
```

## Roles (per `mem://design/hmi-brief`)

| Role            | Size | Weight | Notes                   |
| --------------- | ---- | ------ | ----------------------- |
| Title bar       | 12px | 500    | uppercase tracking-wide |
| Action header   | 13px | 500    |                         |
| Body / labels   | 13px | 400    |                         |
| Tool tile label | 12px | 500    |                         |
| Counter / value | 20px | 600    | `tabular-nums`          |
| Status badge    | 12px | 700    | uppercase               |

## Why no webfont

- Zero network cost on factory intranets.
- No FOUT during hardware boot sequences.
- `Segoe UI` on Windows kiosks and `system-ui` on Linux HMI panels both render the same numeric shapes with `tnum`.
- No `<link>` preconnect needed in `src/routes/__root.tsx`.
