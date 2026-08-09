#!/usr/bin/env python3
"""Emit Mermaid diagrams of IPC validator paths and error edges.

Reads the same inputs as ``check-ipc-examples.py`` and
``check-ui-backend-map.py --strict-schema`` and writes two diagrams under
``docs/diagrams/`` that visualize what the validators check and where any
current failures live:

  docs/diagrams/ipc-error-path.mmd   schema file -> $def -> ref site
  docs/diagrams/ipc-error-edge.mmd   caller -> method -> $def

Broken edges (missing $def, unused def, or unresolved ref) are drawn with
``==>`` and tagged with the matching error code so a reader can trace a
CI failure straight from the diagram to the responsible file.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCHEMA_DIR = ROOT / "spec" / "21-app" / "shell" / "schemas" / "ipc"
OUT_DIR = ROOT / "docs" / "diagrams"
REF_RE = re.compile(r"<!--\s*ipc:ref=([a-z][a-z0-9.]+\.(?:req|res|stream))\s*-->")


def sid(prefix: str, value: str) -> str:
    """Mermaid-safe node id."""
    return f"{prefix}_" + re.sub(r"[^A-Za-z0-9]", "_", value)


def collect() -> tuple[dict[str, list[str]], dict[str, set[Path]], dict[str, set[Path]]]:
    defs: dict[str, list[str]] = {}
    for schema_path in sorted(SCHEMA_DIR.glob("*.schema.json")):
        data = json.loads(schema_path.read_text(encoding="utf-8"))
        defs[schema_path.name] = sorted((data.get("$defs") or {}).keys())

    real: dict[str, set[Path]] = {}
    fixture: dict[str, set[Path]] = {}
    for md_path in ROOT.rglob("*.md"):
        rel = md_path.relative_to(ROOT)
        if rel.parts and rel.parts[0] not in {"spec", "linter-scripts"}:
            continue
        bucket = fixture if "fixtures" in rel.parts else real
        try:
            text = md_path.read_text(encoding="utf-8")
        except OSError:
            continue
        for match in REF_RE.finditer(text):
            bucket.setdefault(match.group(1), set()).add(rel)
    return defs, real, fixture


def build_error_path(defs, real, fixture) -> str:
    def_keys = {d for entries in defs.values() for d in entries}
    all_refs = set(real) | set(fixture)
    missing = all_refs - def_keys  # ref -> no $def  (E_SPEC_IPC_EXAMPLE)
    unused = def_keys - all_refs   # $def -> no ref  (drift risk)

    lines: list[str] = ["flowchart LR"]
    lines.append('  classDef broken stroke:#b00020,color:#b00020,stroke-width:2px;')
    for schema, entries in defs.items():
        sn = sid("s", schema)
        lines.append(f'  {sn}["{schema}"]')
        for d in entries:
            dn = sid("d", d)
            lines.append(f'  {dn}(["{d}"])')
            if d in unused:
                lines.append(f'  {sn} ==>|E_SPEC_UI_MAP_ORPHAN unused| {dn}')
                lines.append(f'  class {dn} broken;')
            else:
                lines.append(f'  {sn} --> {dn}')
    for ref, sites in real.items():
        rn = sid("d", ref)
        for site in sorted(sites):
            site_id = sid("r", str(site))
            lines.append(f'  {site_id}[/"{site}"/]')
            if ref in missing:
                lines.append(f'  {rn} ==>|E_SPEC_IPC_EXAMPLE missing| {site_id}')
                lines.append(f'  class {rn} broken;')
                lines.append(f'  class {site_id} broken;')
            else:
                lines.append(f'  {rn} --> {site_id}')
    return "\n".join(lines) + "\n"


def build_error_edge(defs) -> str:
    """Method -> $def edges, split into req / res / stream lanes."""
    lines: list[str] = ["flowchart TD"]
    methods: dict[str, dict[str, tuple[str, str]]] = {}
    for schema, entries in defs.items():
        for d in entries:
            parts = d.rsplit(".", 1)
            if len(parts) != 2 or parts[1] not in {"req", "res", "stream"}:
                continue
            methods.setdefault(parts[0], {})[parts[1]] = (schema, d)
    for method in sorted(methods):
        mn = sid("m", method)
        lines.append(f'  {mn}(["{method}"])')
        for kind in ("req", "res", "stream"):
            entry = methods[method].get(kind)
            if not entry:
                continue
            _, d = entry
            dn = sid("d", d)
            lines.append(f'  {dn}["{d}"]')
            lines.append(f'  {mn} -->|{kind}| {dn}')
    return "\n".join(lines) + "\n"


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    defs, real, fixture = collect()
    (OUT_DIR / "ipc-error-path.mmd").write_text(build_error_path(defs, real, fixture), encoding="utf-8")
    (OUT_DIR / "ipc-error-edge.mmd").write_text(build_error_edge(defs), encoding="utf-8")
    print(f"wrote {OUT_DIR/'ipc-error-path.mmd'}")
    print(f"wrote {OUT_DIR/'ipc-error-edge.mmd'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
