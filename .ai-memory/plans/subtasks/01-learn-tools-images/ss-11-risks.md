# SS-11 — Ambiguities & Risks Register

Consolidated open questions from SS-04..SS-10. Each entry: **question**,
**source**, **impact if unresolved**, **default assumption for build**,
**resolution owner**.

## A. Visual / design ambiguities

1. **Exact accent hues** — sampled palette (SS-04) averages pixels; real HMI may use vendor-specified sRGB values (Keyence). Impact: brand-off tokens. Default: use SS-04 palette; expose as CSS vars for easy retune. Owner: designer sign-off.
2. **Typography** — SS-05 proposed Inter / Segoe UI; actual UI likely uses a Windows system font. Impact: kerning drift on counters. Default: `system-ui, "Segoe UI", Inter, sans-serif` + `tabular-nums`. Owner: user pick.
3. **Icon set license** — SS-07 identifies isometric illustrated tiles; recreating vs licensing. Impact: legal + time. Default: commission look-alike SVG set. Owner: user.

## B. Structural ambiguities

4. **Tool taxonomy** — exact list & grouping of tools on the ribbon not exhaustively labeled. Impact: incomplete tool catalog. Default: 7 families from SS-10 §1. Owner: image-by-image labeling pass (future SS).
5. **Reference image cardinality** — single vs multi-slot registration unclear (SS-10 §6). Impact: schema shape. Default: array of reference images with `primary: boolean`. Owner: user.
6. **Role model** — Operator vs Engineer inferred, not proven (SS-10 §6). Impact: gating logic. Default: two roles behind a toggle, no auth in MVP. Owner: user.
7. **Units default** — px vs mm depends on calibration. Impact: measurement display. Default: px; show mm only if calibration present. Owner: user.

## C. Flow ambiguities (from SS-09)

8. **ROI editor return path** — modal-over-tool-config vs full-screen with back. Default: modal overlay preserving tool-config scroll. Owner: designer.
9. **Error List behavior** — interrupt overlay vs side drawer vs dedicated route. Default: route `/errors` + toast for new criticals. Owner: user.
10. **Run screen navigation lock** — is nav disabled while running? Default: yes, guarded route leave with confirm. Owner: user.

## D. Data / backend ambiguities

11. **Persistence layer** — Lovable Cloud not yet enabled. Impact: no save/load in MVP. Default: in-memory + localStorage draft; enable Cloud when user asks for auth or persistence. Owner: user.
12. **Result stream volume** — inspection can be high-frequency; storing every frame may be excessive. Default: keep last N=1000 in memory; persist only NG + samples. Owner: user.
13. **Image storage** — reference images can be large (>10MB, see externalized asset). Default: compress to WebP ≤2MB on upload; keep original in Lovable Storage bucket when Cloud is enabled. Owner: user.

## E. Risks (not questions — things that will bite)

- **R1 Camera hardware access** — browsers cannot talk to industrial cameras; the clone is UI-only unless a bridge service is provided.
- **R2 Realtime performance** — canvas-based ROI editor + live viewport requires careful re-render discipline (RAF, offscreen canvas).
- **R3 Scope creep** — full Keyence CV-X feature set is huge; MVP must stay to SS-10 §5.
- **R4 Legal / brand** — cloning a commercial HMI 1:1 (logos, exact iconography, product name) risks IP issues; label the clone clearly as a study.

## Decisions needed before step 12 (design-token export)

Only #1, #2 gate step 12. All others can carry defaults into build and be
revisited. Step 12 will emit tokens for the SS-04 palette and the default
type stack; any later change is a token-file swap.
