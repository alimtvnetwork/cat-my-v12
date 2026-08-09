#!/usr/bin/env python3
"""AST-walk BE/**/*.py Pydantic models, fail if any field name matches a class defined in the same module.
Enforces S6 of Plan 89 to prevent the bug described in 2026-07-21-pydantic-field-name-shadows-class.md
"""

import ast
import sys
from pathlib import Path

def check_file(path: Path) -> list[str]:
    try:
        content = path.read_text(encoding="utf-8")
        tree = ast.parse(content, filename=str(path))
    except Exception as e:
        return [f"{path}: Failed to parse: {e}"]

    errors = []
    
    # 1. Find all classes defined in this module
    defined_classes = {node.name for node in tree.body if isinstance(node, ast.ClassDef)}
    
    # 2. Find all Pydantic model class definitions
    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            for child in node.body:
                if isinstance(child, ast.AnnAssign) and isinstance(child.target, ast.Name):
                    field_name = child.target.id
                    if field_name in defined_classes:
                        errors.append(
                            f"{path}:{child.lineno}: Field '{field_name}' in class '{node.name}' "
                            f"shadows class '{field_name}' defined in the same module. "
                            f"Use a lowercase field name and Field(alias='{field_name}') instead."
                        )
    return errors

def main():
    root = Path(__file__).parent.parent.parent / "BE"
    all_errors = []
    
    if not root.exists():
        print(f"Skipping lint: BE directory not found at {root}")
        sys.exit(0)
        
    for p in root.rglob("*.py"):
        all_errors.extend(check_file(p))
        
    if all_errors:
        for err in all_errors:
            print(err)
        sys.exit(1)
        
if __name__ == "__main__":
    main()
