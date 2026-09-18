#!/usr/bin/env python3
"""
High-performance fast file reader and directory explorer utility for AI agents.
Provides fast directory exploration, bounded file content reading, and pattern search
with local 2-tier caching in tmp/cache/.
"""

import os
import sys
import argparse
import json
import re
import hashlib
from pathlib import Path

# Ensure UTF-8 output
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

CACHE_DIR = Path("tmp/cache")


def get_cache_path(key: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    hash_key = hashlib.sha256(key.encode("utf-8")).hexdigest()
    return CACHE_DIR / f"{hash_key}.json"


def list_folder(folder_path: str, extensions: list = None) -> list:
    cache_key = f"list:{folder_path}:{','.join(sorted(extensions)) if extensions else 'all'}"
    cache_file = get_cache_path(cache_key)

    base = Path(folder_path)
    if not base.exists():
        return []

    # Check cache freshness
    if cache_file.exists():
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            return data
        except Exception:
            pass

    results = []
    ext_set = set(e.lower() if e.startswith(".") else f".{e.lower()}" for e in extensions) if extensions else None

    for root, _, files in os.walk(base):
        for file in files:
            p = Path(root) / file
            if ext_set is None or p.suffix.lower() in ext_set:
                results.append(str(p.as_posix()))

    results.sort()
    try:
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(results, f)
    except Exception:
        pass

    return results


def read_file(file_path: str, max_bytes: int = None) -> str:
    p = Path(file_path)
    if not p.exists() or not p.is_file():
        return f"[ERROR: File not found: {file_path}]"

    try:
        with open(p, "r", encoding="utf-8", errors="replace") as f:
            if max_bytes and max_bytes > 0:
                content = f.read(max_bytes)
            else:
                content = f.read()
        return content
    except Exception as e:
        return f"[ERROR reading {file_path}: {e}]"


def search_pattern(pattern: str, search_path: str = ".", extensions: list = None) -> list:
    regex = re.compile(pattern, re.IGNORECASE)
    files = list_folder(search_path, extensions)
    matches = []

    for f_path in files:
        try:
            with open(f_path, "r", encoding="utf-8", errors="replace") as f:
                for line_no, line in enumerate(f, start=1):
                    if regex.search(line):
                        matches.append({
                            "file": f_path,
                            "line": line_no,
                            "content": line.strip()
                        })
        except Exception:
            continue

    return matches


def main():
    parser = argparse.ArgumentParser(description="Fast file reader and directory explorer.")
    parser.add_argument("--list-folder", type=str, help="Recursively list files in a folder.")
    parser.add_argument("--read-file", type=str, help="Read file contents.")
    parser.add_argument("--max-bytes", type=int, default=None, help="Max bytes to read.")
    parser.add_argument("--search-pattern", type=str, help="Search regex pattern across files.")
    parser.add_argument("--path", type=str, default=".", help="Base path for search.")
    parser.add_argument("--ext", type=str, default=None, help="Comma-separated extensions (e.g. .md,.ts).")

    args = parser.parse_args()
    extensions = [e.strip() for e in args.ext.split(",")] if args.ext else None

    if args.list_folder:
        files = list_folder(args.list_folder, extensions)
        print(json.dumps(files, indent=2))
    elif args.read_file:
        content = read_file(args.read_file, args.max_bytes)
        print(content)
    elif args.search_pattern:
        results = search_pattern(args.search_pattern, args.path, extensions)
        print(json.dumps(results, indent=2))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
