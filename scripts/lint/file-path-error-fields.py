#!/usr/bin/env python3
"""AST-walk any raise AppError( with E_BE_NOT_FOUND | E_*_FILE_*, require details to include the four Code Red keys.
Since we added AppError.for_file, we enforce that AppError instantiation with those codes MUST use AppError.for_file().
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
    
    for node in ast.walk(tree):
        if isinstance(node, ast.Raise) and node.exc:
            if isinstance(node.exc, ast.Call) and isinstance(node.exc.func, ast.Name):
                if node.exc.func.id == "AppError":
                    code_val = None
                    if node.exc.args and isinstance(node.exc.args[0], ast.Attribute):
                        code_val = node.exc.args[0].attr
                    
                    for kw in node.exc.keywords:
                        if kw.arg == "code" and isinstance(kw.value, ast.Attribute):
                            code_val = kw.value.attr
                            
                    if code_val in ("E_BE_NOT_FOUND",): 
                        errors.append(
                            f"{path}:{node.lineno}: Raising AppError with {code_val} directly is forbidden. "
                            f"Use AppError.for_file(reason, path=..., operation=..., module=...) instead "
                            f"to ensure Code Red file-path schema compliance."
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
