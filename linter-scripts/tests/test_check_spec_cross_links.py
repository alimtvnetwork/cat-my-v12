#!/usr/bin/env python3
"""Unit tests for linter-scripts/check-spec-cross-links.py."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent  # linter-scripts/
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import importlib.util

spec = importlib.util.spec_from_file_location("checker", ROOT / "check-spec-cross-links.py")
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)


class TestStripCodeFences(unittest.TestCase):
    def test_standard_code_fence(self) -> None:
        raw = "Line 1\n```go\nfunc foo[T](x) {}\n```\nLine 5"
        stripped = checker.strip_code_fences(raw)
        lines = stripped.splitlines()
        self.assertEqual(len(lines), 5)
        self.assertEqual(lines[0], "Line 1")
        self.assertEqual(lines[1], "")
        self.assertEqual(lines[2], "")
        self.assertEqual(lines[3], "")
        self.assertEqual(lines[4], "Line 5")

    def test_blockquote_code_fence(self) -> None:
        raw = "Line 1\n> ```go\n> return FailSlice[Plugin](err)\n> ```\nLine 5"
        stripped = checker.strip_code_fences(raw)
        lines = stripped.splitlines()
        self.assertEqual(len(lines), 5)
        self.assertEqual(lines[0], "Line 1")
        self.assertEqual(lines[1], "")
        self.assertEqual(lines[2], "")
        self.assertEqual(lines[3], "")
        self.assertEqual(lines[4], "Line 5")

    def test_nested_four_backtick_fence(self) -> None:
        raw = "Line 1\n````markdown\n```go\nfoo\n```\n````\nLine 7"
        stripped = checker.strip_code_fences(raw)
        lines = stripped.splitlines()
        self.assertEqual(len(lines), 7)
        self.assertEqual(lines[0], "Line 1")
        self.assertEqual(lines[6], "Line 7")
        for i in range(1, 6):
            self.assertEqual(lines[i], "")


class TestStripInlineCode(unittest.TestCase):
    def test_go_generics_in_table(self) -> None:
        raw = "| `Ok[T](value)` | `Result[T]` |"
        stripped = checker.strip_inline_code(raw)
        self.assertNotIn("[T](value)", stripped)
        self.assertNotIn("`", stripped)
        self.assertEqual(len(stripped), len(raw))

    def test_link_example_in_code(self) -> None:
        raw = "- Links: `[text](url)` -> <a>"
        stripped = checker.strip_inline_code(raw)
        self.assertNotIn("[text](url)", stripped)
        self.assertEqual(len(stripped), len(raw))

    def test_link_with_inline_code_in_text(self) -> None:
        raw = "See [`SpecialService`](service.md) for details."
        stripped = checker.strip_inline_code(raw)
        match = checker.MD_LINK_RE.search(stripped)
        self.assertIsNotNone(match)
        self.assertEqual(match.group(2), "service.md")


class TestSlugify(unittest.TestCase):
    def test_em_dash_double_hyphen(self) -> None:
        slug = checker.slugify("2.8 — No Inline Statements")
        self.assertEqual(slug, "28--no-inline-statements")

    def test_standard_heading(self) -> None:
        slug = checker.slugify("Error Architecture & Handlers")
        self.assertEqual(slug, "error-architecture--handlers")


class TestScanEndToEnd(unittest.TestCase):
    def test_scan_identifies_real_broken_and_skips_code(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            target = tmp_path / "target.md"
            target.write_text("# Target Section\n\nContent here.\n", encoding="utf-8")

            source = tmp_path / "source.md"
            source.write_text("""# Source

- Valid: [Target](target.md#target-section)
- Valid code link: [`TargetClass`](target.md)
- Broken file: [Bad File](nonexistent.md)
- Broken section: [Bad Section](target.md#nonexistent-section)
- Go generic: `Ok[T](value)`
- Example link in backticks: `[example](dummy.md)`
> ```go
> Fail[T](err)
> ```
""", encoding="utf-8")

            failures = checker.scan(tmp_path, tmp_path)
            self.assertEqual(len(failures), 2)
            targets = {f["target"]: f["kind"] for f in failures}
            self.assertEqual(targets.get("nonexistent.md"), "missing-file")
            self.assertEqual(targets.get("target.md#nonexistent-section"), "missing-section")


if __name__ == "__main__":
    unittest.main()
