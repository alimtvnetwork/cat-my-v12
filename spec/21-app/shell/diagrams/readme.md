# Diagrams index

Mermaid `.mmd` files visualising `spec/21-app/shell/`. Render locally with
`mmdc -i <file>.mmd -o <file>.svg` or preview via Lovable's Mermaid artifact
support (`mime_type: text/vnd.mermaid`).

| File                        | Chapter                       | Purpose                                             |
| --------------------------- | ----------------------------- | --------------------------------------------------- |
| `01-context.mmd`            | 00-overview                   | User + shell + worker + external systems            |
| `02-process-model.mmd`      | 02-runtime-architecture       | Shell / renderer / worker processes and threads     |
| `03-boot-sequence.mmd`      | 03-boot-lifecycle             | Cold start from launch to interactive               |
| `04-ipc-request.mmd`        | 04-ipc-contract               | Request/response envelope + error paths             |
| `05-update-flow.mmd`        | 08-updates-binding            | Check → verify → apply → rollback                   |
| `06-crash-recovery.mmd`     | 02, 12                        | Worker / renderer / shell crash states              |
| `07-permissions.mmd`        | 07-permissions-and-consent    | Prompt + persist + revoke lifecycle                 |
| `08-packaging-pipeline.mmd` | 09-packaging, 10-code-signing | Build → sign → publish                              |
| `09-ui-to-backend-map.mmd`  | 05-ui-to-backend-map          | Routes / HMI / ops → worker methods (overview)      |
| `methods/*.mmd`             | 05-ui-to-backend-map          | One diagram per IPC method; see `methods/readme.md` |

## Rules

- Every diagram is single-purpose; do not merge concerns across files.
- No emojis in Mermaid source (lexer errors).
- Use theme-neutral colors; rely on Mermaid's default theme.
- Update the diagram whenever its parent chapter changes; the diagram is
  authoritative for shape, the chapter is authoritative for text.
