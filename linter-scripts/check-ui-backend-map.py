#!/usr/bin/env python3
"""Check shell UI, IPC method, schema, and Mermaid coverage."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ERROR_CODE = "E_SPEC_UI_MAP_ORPHAN"
METHOD_RE = re.compile(r"^[a-z]+(?:\.[a-z]+)+$")
REF_RE = re.compile(r"^[a-z]+(?:\.[a-z]+)+\.(?:req|res|stream)$")
CALL_RE = re.compile(r"\b(useServerFn|fetch\(|WebSocket\()")
REQUIRED_PATH_KEYS = ("map", "schema_readme", "method_index", "schema_dir", "methods_dir")


def split_row(line: str) -> list[str]:
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def is_data_row(cells: list[str]) -> bool:
    if len(cells) < 3:
        return False
    has_header = cells[0].lower() in {"ui element", "component", "route"}
    has_rule = set(cells[0]) <= {"-", ":"}
    return not has_header and not has_rule


def ticks(cell: str) -> list[str]:
    return re.findall(r"`([^`]+)`", cell)


def method_from(cell: str) -> str | None:
    values = [value for value in ticks(cell) if METHOD_RE.match(value)]
    values = [value for value in values if not REF_RE.match(value)]
    return values[0] if values else None


def ui_from(cell: str) -> str | None:
    values = [value for value in ticks(cell) if value.startswith("src/")]
    return values[0] if values else None


def refs_from(cells: list[str]) -> list[str]:
    values: list[str] = []
    for cell in cells:
        values.extend(value for value in ticks(cell) if REF_RE.match(value))
    return values


def parse_map(path: Path) -> tuple[set[str], set[str], dict[str, set[str]]]:
    methods: set[str] = set()
    ui_files: set[str] = set()
    refs: dict[str, set[str]] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        cells = split_row(line) if line.startswith("|") else []
        if not is_data_row(cells):
            continue
        ui = ui_from(cells[0])
        method = method_from(cells[2])
        if ui:
            ui_files.add(ui)
        if method:
            methods.add(method)
            refs.setdefault(method, set()).update(refs_from(cells[3:5]))
    return methods, ui_files, refs


def parse_schema_groups(path: Path) -> dict[str, str]:
    groups: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        cells = split_row(line) if line.startswith("|") else []
        if not is_data_row(cells) or len(cells) < 3:
            continue
        schema = next((value for value in ticks(cells[1]) if value.endswith(".json")), "")
        for method in [value for value in ticks(cells[2]) if METHOD_RE.match(value)]:
            groups[method] = schema
    return groups


def parse_method_index(path: Path) -> set[str]:
    methods: set[str] = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        cells = split_row(line) if line.startswith("|") else []
        if is_data_row(cells):
            method = method_from(cells[0])
            if method:
                methods.add(method)
    return methods


def diagram_methods(path: Path) -> set[str]:
    return {item.stem for item in path.glob("*.mmd") if METHOD_RE.match(item.stem)}


def schema_defs(path: Path) -> set[str]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except OSError as exc:
        print(f"{ERROR_CODE}: cannot read schema JSON: {path}: {exc}", file=sys.stderr)
        return set()
    except json.JSONDecodeError as exc:
        print(f"{ERROR_CODE}: invalid schema JSON: {path}: {exc}", file=sys.stderr)
        return set()
    return set(payload.get("$defs", {}).keys())


def active_call_files(roots: list[Path], repo_root: Path) -> set[str]:
    files: set[str] = set()
    for root in roots:
        if not root.exists():
            continue
        for path in root.rglob("*.tsx"):
            text = path.read_text(encoding="utf-8", errors="replace")
            if CALL_RE.search(text):
                files.add(str(path.relative_to(repo_root)))
    return files


def add_missing(label: str, values: set[str], failures: list[str]) -> None:
    for value in sorted(values):
        failures.append(f"{ERROR_CODE}: {label}: {value}")


def check_sets(label: str, left: set[str], right: set[str], failures: list[str]) -> None:
    add_missing(f"missing {label}", left - right, failures)
    add_missing(f"orphan {label}", right - left, failures)


def check_schema_files(
    methods: set[str], groups: dict[str, str], schema_dir: Path, failures: list[str]
) -> None:
    for method in sorted(methods):
        schema = groups.get(method, "")
        if schema and (schema_dir / schema).is_file():
            continue
        failures.append(f"{ERROR_CODE}: missing schema group for method: {method}")


def check_schema_refs(
    refs: dict[str, set[str]], groups: dict[str, str], schema_dir: Path, failures: list[str]
) -> None:
    cache: dict[str, set[str]] = {}
    for method, names in sorted(refs.items()):
        schema = groups.get(method, "")
        cache.setdefault(schema, schema_defs(schema_dir / schema))
        missing = names - cache[schema]
        add_missing(f"missing schema $defs in {schema}", missing, failures)


def parse_failure(raw: str) -> dict[str, str]:
    """Split a ``CODE: category: detail`` string into structured fields."""
    code, _, rest = raw.partition(":")
    category, sep, detail = rest.strip().partition(":")
    if not sep:
        return {"code": code.strip(), "category": "", "detail": category.strip(), "message": raw}
    return {"code": code.strip(), "category": category.strip(), "detail": detail.strip(), "message": raw}


def emit(failures: list[str], as_json: bool = False) -> None:
    if as_json:
        import json as _json
        payload = {
            "ok": not failures,
            "error_code": ERROR_CODE,
            "count": len(failures),
            "failures": [parse_failure(f) for f in failures],
        }
        print(_json.dumps(payload, indent=2))
        return
    if not failures:
        print("OK UI backend map, diagrams, schemas, and caller files align.")
        return
    print(f"FAIL {len(failures)} UI backend coverage issue(s):")
    for failure in failures:
        print(f"  {failure}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--strict-schema", action="store_true")
    parser.add_argument("--json", action="store_true",
                        help="Emit machine-readable JSON instead of text.")
    return parser.parse_args()


def shell_paths(root: Path) -> dict[str, Path]:
    shell = root / "spec" / "21-app" / "shell"
    return {
        "map": shell / "05-ui-to-backend-map.md",
        "schema_readme": shell / "schemas" / "ipc" / "readme.md",
        "method_index": shell / "diagrams" / "methods" / "readme.md",
        "schema_dir": shell / "schemas" / "ipc",
        "methods_dir": shell / "diagrams" / "methods",
    }


def missing_required(paths: dict[str, Path]) -> list[str]:
    failures: list[str] = []
    for key in REQUIRED_PATH_KEYS:
        if paths[key].exists():
            continue
        failures.append(f"{ERROR_CODE}: missing required path: {paths[key]}")
    return failures


def scan_roots(root: Path) -> list[Path]:
    return [root / "src" / "routes", root / "src" / "components" / "hmi", root / "src" / "components" / "ops"]


def run_check(root: Path, is_strict_schema: bool) -> list[str]:
    paths = shell_paths(root)
    path_failures = missing_required(paths)
    if path_failures:
        return path_failures
    methods, ui_files, refs = parse_map(paths["map"])
    groups = parse_schema_groups(paths["schema_readme"])
    failures: list[str] = []
    check_sets("diagram method", methods, diagram_methods(paths["methods_dir"]), failures)
    check_sets("method index row", methods, parse_method_index(paths["method_index"]), failures)
    check_schema_files(methods, groups, paths["schema_dir"], failures)
    add_missing("caller file has no map row", active_call_files(scan_roots(root), root) - ui_files, failures)
    add_missing("map row points at missing UI file", {f for f in ui_files if not (root / f).is_file()}, failures)
    if is_strict_schema:
        check_schema_refs(refs, groups, paths["schema_dir"], failures)
    return failures


def main() -> int:
    args = parse_args()
    failures = run_check(Path(args.repo_root).resolve(), args.strict_schema)
    emit(failures, as_json=args.json)
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())