#!/usr/bin/env python3
"""Generate a schema coverage report for IPC $defs.

For every ``spec/21-app/shell/schemas/ipc/*.schema.json`` file, list each
``$defs`` entry and mark whether it is referenced by an
``<!-- ipc:ref=<name> -->`` block anywhere under ``spec/`` (real usage) or
only under ``linter-scripts/fixtures/`` (test-only), plus any refs that
are used but have no matching ``$defs`` target (missing).

Writes two files:

  reports/schema-coverage.md
  reports/schema-coverage.html

Run:  python3 linter-scripts/generate-schema-coverage-report.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCHEMA_DIR = ROOT / "spec" / "21-app" / "shell" / "schemas" / "ipc"
OUT_DIR = ROOT / "reports"
REF_RE = re.compile(r"<!--\s*ipc:ref=([a-z][a-z0-9.]+\.(?:req|res|stream))\s*-->")


def collect_defs() -> dict[str, list[str]]:
    """Return {schema_file_name: [def_name, ...]}."""
    result: dict[str, list[str]] = {}
    for schema_path in sorted(SCHEMA_DIR.glob("*.schema.json")):
        data = json.loads(schema_path.read_text(encoding="utf-8"))
        result[schema_path.name] = sorted((data.get("$defs") or {}).keys())
    return result


def collect_refs() -> tuple[dict[str, set[Path]], dict[str, set[Path]]]:
    """Return (real_refs, fixture_refs) each as {ref: {file, ...}}."""
    real: dict[str, set[Path]] = {}
    fixture: dict[str, set[Path]] = {}
    for md_path in ROOT.rglob("*.md"):
        rel = md_path.relative_to(ROOT)
        parts = rel.parts
        if parts and parts[0] not in {"spec", "linter-scripts"}:
            continue
        try:
            text = md_path.read_text(encoding="utf-8")
        except OSError:
            continue
        bucket = fixture if "fixtures" in parts else real
        for match in REF_RE.finditer(text):
            bucket.setdefault(match.group(1), set()).add(rel)
    return real, fixture


def build_report() -> tuple[str, str]:
    defs = collect_defs()
    real, fixture = collect_refs()

    all_defs = {f"{name.split('.schema.json')[0]}.{d}": (name, d)
                for name, entries in defs.items() for d in entries}
    # Refs use the $defs key directly (e.g. "home.summary.req"); match by key.
    def_keys = {d for entries in defs.values() for d in entries}

    used_real = set(real) & def_keys
    used_fixture_only = (set(fixture) - set(real)) & def_keys
    unused = def_keys - set(real) - set(fixture)
    missing = (set(real) | set(fixture)) - def_keys

    total = len(def_keys)
    covered = len(used_real)
    pct = (covered / total * 100.0) if total else 100.0

    # --- Markdown ---
    md: list[str] = []
    md.append("# IPC Schema Coverage Report")
    md.append("")
    md.append(f"- Schema files: **{len(defs)}**")
    md.append(f"- Total `$defs` entries: **{total}**")
    md.append(f"- Referenced in spec: **{covered}** ({pct:.1f}%)")
    md.append(f"- Fixture-only references: **{len(used_fixture_only)}**")
    md.append(f"- Unused (no reference anywhere): **{len(unused)}**")
    md.append(f"- Missing (referenced but no `$defs`): **{len(missing)}**")
    md.append("")
    md.append("## Per-schema coverage")
    md.append("")
    md.append("| Schema | $def | Status | Referenced from |")
    md.append("|---|---|---|---|")
    for name in sorted(defs):
        for d in defs[name]:
            if d in real:
                status = "resolved"
                sites = ", ".join(sorted(str(p) for p in real[d]))
            elif d in fixture:
                status = "fixture-only"
                sites = ", ".join(sorted(str(p) for p in fixture[d]))
            else:
                status = "unused"
                sites = "-"
            md.append(f"| `{name}` | `{d}` | {status} | {sites} |")
    md.append("")
    md.append("## Missing $defs (referenced but not defined)")
    md.append("")
    if missing:
        md.append("| Ref | Referenced from |")
        md.append("|---|---|")
        for ref in sorted(missing):
            sites = sorted(str(p) for p in (real.get(ref, set()) | fixture.get(ref, set())))
            md.append(f"| `{ref}` | {', '.join(sites)} |")
    else:
        md.append("_None._")
    md.append("")

    # --- HTML ---
    def esc(s: str) -> str:
        return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))

    html: list[str] = []
    html.append("<!doctype html><meta charset='utf-8'>")
    html.append("<title>IPC Schema Coverage Report</title>")
    html.append("<style>body{font:14px system-ui;margin:2rem;max-width:1100px}"
                "table{border-collapse:collapse;width:100%;margin:1rem 0}"
                "th,td{border:1px solid #ddd;padding:.4rem .6rem;text-align:left;vertical-align:top}"
                "th{background:#f4f4f4}"
                ".resolved{color:#0a7a2f;font-weight:600}"
                ".fixture-only{color:#a06400;font-weight:600}"
                ".unused{color:#999}"
                ".missing{color:#b00020;font-weight:600}"
                "code{background:#f4f4f4;padding:1px 4px;border-radius:3px}</style>")
    html.append("<h1>IPC Schema Coverage Report</h1>")
    html.append("<ul>")
    html.append(f"<li>Schema files: <b>{len(defs)}</b></li>")
    html.append(f"<li>Total <code>$defs</code>: <b>{total}</b></li>")
    html.append(f"<li>Referenced in spec: <b>{covered}</b> ({pct:.1f}%)</li>")
    html.append(f"<li>Fixture-only: <b>{len(used_fixture_only)}</b></li>")
    html.append(f"<li>Unused: <b>{len(unused)}</b></li>")
    html.append(f"<li>Missing: <b>{len(missing)}</b></li>")
    html.append("</ul>")
    html.append("<h2>Per-schema coverage</h2>")
    html.append("<table><thead><tr><th>Schema</th><th>$def</th><th>Status</th><th>Referenced from</th></tr></thead><tbody>")
    for name in sorted(defs):
        for d in defs[name]:
            if d in real:
                status = "resolved"
                sites = sorted(str(p) for p in real[d])
            elif d in fixture:
                status = "fixture-only"
                sites = sorted(str(p) for p in fixture[d])
            else:
                status = "unused"
                sites = ["-"]
            html.append(f"<tr><td><code>{esc(name)}</code></td>"
                        f"<td><code>{esc(d)}</code></td>"
                        f"<td class='{status}'>{status}</td>"
                        f"<td>{esc(', '.join(sites))}</td></tr>")
    html.append("</tbody></table>")
    html.append("<h2>Missing $defs (referenced but not defined)</h2>")
    if missing:
        html.append("<table><thead><tr><th>Ref</th><th>Referenced from</th></tr></thead><tbody>")
        for ref in sorted(missing):
            sites = sorted(str(p) for p in (real.get(ref, set()) | fixture.get(ref, set())))
            html.append(f"<tr><td class='missing'><code>{esc(ref)}</code></td>"
                        f"<td>{esc(', '.join(sites))}</td></tr>")
        html.append("</tbody></table>")
    else:
        html.append("<p><i>None.</i></p>")

    return "\n".join(md), "\n".join(html)


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    md, html = build_report()
    (OUT_DIR / "schema-coverage.md").write_text(md, encoding="utf-8")
    (OUT_DIR / "schema-coverage.html").write_text(html, encoding="utf-8")
    print(f"wrote {OUT_DIR/'schema-coverage.md'}")
    print(f"wrote {OUT_DIR/'schema-coverage.html'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
