# Naming Conventions (from spec/04-database-conventions + spec/02-coding-guidelines)

## Database (hard rules — CODE-RED)

1. **Singular table names** — `User`, not `Users`.
2. **PascalCase everywhere** — tables, columns, indexes, views, JSON fields.
3. **PK = `{TableName}Id`** — `INTEGER PRIMARY KEY AUTOINCREMENT`. Never UUID unless required.
4. **FK = exact PK name** — child table uses `UserId`, not `user_id` / `fk_user`.
5. **Smallest key type** — `INTEGER` over `BIGINT`.
6. **Repeated values → separate table**, joined via FK.
7. **Views for joins** — never ad-hoc joins in business code.
8. **ORM only** — no raw SQL in business logic.
9. **In-memory SQLite for tests.**

## Booleans

- Prefix with `is` / `has` / `should`.
- **Positive names only** — `IsActive`, never `IsDisabled` / `NotReady`.
- Multi-part conditions → extract to named variable.

## Functions & code shape

- No boolean flag parameters — split into two functions.
- Zero nesting: early returns, guard clauses.
- Function hard cap ≈ 15 lines (from `.lovable/coding-guidelines/`).
- No raw negations in conditions — use positive guard functions.

## API responses

- PascalCase keys, wrapped in Universal Response Envelope:

```json
{ "Status": { "IsSuccess": true, "Code": 200, "Message": "OK" },
  "Attributes": { "RequestedAt": "..." },
  "Results": [ ... ] }
```

- Frontend detection uses HTTP status (2xx), not body flags.
