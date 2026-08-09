#!/usr/bin/env python3
"""Validate annotated IPC example payloads against schema $defs.

Scans one or more Markdown files for blocks of the form:

    <!-- ipc:ref=home.summary.req -->
    ```json
    { ... }
    ```

Each block is validated against `$defs["<ref>"]` in whichever
`spec/21-app/shell/schemas/ipc/*.schema.json` declares that entry.

The validator is a minimal Draft 2020-12 subset covering constructs used
by this project's IPC schemas: type (string/list), required, properties,
additionalProperties (bool), items, enum, const, minimum/maximum,
$ref to `#/$defs/<name>` in the same document. It is intentionally
strict about `additionalProperties: false` and unknown $ref targets.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

ERROR_CODE = "E_SPEC_IPC_EXAMPLE"
BLOCK_RE = re.compile(
    r"<!--\s*ipc:ref=(?P<ref>[a-z][a-z0-9.]+\.(?:req|res|stream))\s*-->"
    r"\s*```json\s*(?P<body>.*?)```",
    re.DOTALL,
)


def build_ref_index(schema_dir: Path) -> tuple[dict[str, tuple[str, dict]], dict[str, dict]]:
    """Return (ref -> (schema_file, $defs entry), schema_file -> root)."""
    ref_index: dict[str, tuple[str, dict]] = {}
    roots: dict[str, dict] = {}
    for path in sorted(schema_dir.glob("*.schema.json")):
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        roots[path.name] = payload
        for name, node in payload.get("$defs", {}).items():
            if isinstance(node, dict):
                ref_index.setdefault(name, (path.name, node))
    return ref_index, roots



def resolve_ref(root: dict, ref: str) -> dict | None:
    if not ref.startswith("#/"):
        return None
    node: Any = root
    for part in ref[2:].split("/"):
        if not isinstance(node, dict) or part not in node:
            return None
        node = node[part]
    return node if isinstance(node, dict) else None


def type_ok(value: Any, expected: str) -> bool:
    if expected == "string":
        return isinstance(value, str)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "object":
        return isinstance(value, dict)
    if expected == "array":
        return isinstance(value, list)
    if expected == "null":
        return value is None
    return True


def validate(root: dict, schema: dict, value: Any, path: str, errors: list[str]) -> None:
    if "$ref" in schema:
        target = resolve_ref(root, schema["$ref"])
        if target is None:
            errors.append(f"{path}: unresolved $ref {schema['$ref']}")
            return
        validate(root, target, value, path, errors)
        return
    if "const" in schema and value != schema["const"]:
        errors.append(f"{path}: const {schema['const']!r} but got {value!r}")
    if "enum" in schema and value not in schema["enum"]:
        errors.append(f"{path}: not in enum {schema['enum']!r}: {value!r}")
    types = schema.get("type")
    if isinstance(types, str):
        types = [types]
    if types and not any(type_ok(value, t) for t in types):
        errors.append(f"{path}: expected type {types}, got {type(value).__name__}")
        return
    if isinstance(value, dict):
        props = schema.get("properties", {})
        for key in schema.get("required", []):
            if key not in value:
                errors.append(f"{path}: missing required '{key}'")
        additional = schema.get("additionalProperties", True)
        for key, sub in value.items():
            if key in props:
                validate(root, props[key], sub, f"{path}.{key}", errors)
            elif additional is False:
                errors.append(f"{path}: unexpected property '{key}'")
    elif isinstance(value, list):
        items = schema.get("items")
        if isinstance(items, dict):
            for i, item in enumerate(value):
                validate(root, items, item, f"{path}[{i}]", errors)
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            errors.append(f"{path}: {value} < minimum {schema['minimum']}")
        if "maximum" in schema and value > schema["maximum"]:
            errors.append(f"{path}: {value} > maximum {schema['maximum']}")


def scan_markdown(md_files: list[Path]) -> list[tuple[Path, str, Any]]:
    blocks: list[tuple[Path, str, Any]] = []
    for md in md_files:
        if not md.is_file():
            continue
        text = md.read_text(encoding="utf-8")
        for match in BLOCK_RE.finditer(text):
            ref = match.group("ref")
            try:
                payload = json.loads(match.group("body"))
            except json.JSONDecodeError as exc:
                blocks.append((md, ref, {"__parse_error__": str(exc)}))
                continue
            blocks.append((md, ref, payload))
    return blocks


def collect_md(root: Path) -> list[Path]:
    shell = root / "spec" / "21-app" / "shell"
    return list(shell.rglob("*.md"))


def run(root: Path) -> list[str]:
    schema_dir = root / "spec" / "21-app" / "shell" / "schemas" / "ipc"
    if not schema_dir.is_dir():
        return [f"{ERROR_CODE}: missing schema dir {schema_dir}"]
    ref_index, _roots = build_ref_index(schema_dir)
    failures: list[str] = []
    for md, ref, payload in scan_markdown(collect_md(root)):
        rel_md = md.relative_to(root)
        if isinstance(payload, dict) and "__parse_error__" in payload:
            failures.append(f"{ERROR_CODE}: {rel_md}: invalid JSON for {ref}: {payload['__parse_error__']}")
            continue
        entry = ref_index.get(ref)
        if entry is None:
            failures.append(f"{ERROR_CODE}: {rel_md}: no schema $defs entry for '{ref}'")
            continue
        schema_file, target = entry
        errors: list[str] = []
        # Re-load root for $ref resolution within same schema file.
        root_doc = _roots[schema_file]
        validate(root_doc, target, payload, ref, errors)
        for err in errors:
            failures.append(f"{ERROR_CODE}: {rel_md} ({schema_file}): {err}")
    return failures



def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", default=".")
    args = parser.parse_args()
    failures = run(Path(args.repo_root).resolve())
    if not failures:
        print("OK IPC example payloads validate against schemas.")
        return 0
    print(f"FAIL {len(failures)} IPC example issue(s):")
    for line in failures:
        print(f"  {line}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
