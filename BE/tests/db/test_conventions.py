"""Plan 90 Step 36 - convention compliance scanner for migration files.

Anchors:
- ``spec/04-database-conventions/01-naming-conventions.md`` (PascalCase
  singular tables, ``{Table}Id`` PKs, ``Is``/``Has`` boolean prefix,
  ``Idx{Table}_{Column}`` index names).
- ``spec/21-app/26-migrations.md`` (idempotent ``CREATE TABLE IF NOT
  EXISTS``, terminal ``INSERT INTO SchemaVersion`` row per migration).
- ``.lovable/memory/26-split-db-cli-cheatsheet.md`` §9 (epoch-INTEGER
  ``*At``, no cross-tier FKs).

The scanner is intentionally regex-based rather than a full SQL parser
so it stays a tight guardrail future contributors can read. Each rule
maps to a `test_*` function; a violation lists the offending file +
table + column so the failure is actionable, not "something is wrong".

Documented exceptions (baked in, do not add without spec change):
- ``SchemaVersion.AppliedAt`` is TEXT (LOCKED shape in spec 26 §3);
  every OTHER ``*At`` column must be INTEGER.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

MIGRATIONS_ROOT = Path(__file__).resolve().parents[2] / "db" / "migrations"
TIERS = ("root", "task")

# Root tables belong to Root tier; Task tables to Task tier. Cross-tier FKs
# are forbidden per memory §9. Any ``REFERENCES <Table>`` must point at a
# table declared in the SAME tier.
_TABLE_RE = re.compile(
    r"CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([A-Za-z_][A-Za-z0-9_]*)\s*\((.*?)\n\)\s*;",
    re.IGNORECASE | re.DOTALL,
)
_REFERENCES_RE = re.compile(r"REFERENCES\s+([A-Za-z_][A-Za-z0-9_]*)", re.IGNORECASE)
_SCHEMA_VERSION_INSERT_RE = re.compile(
    r"INSERT\s+INTO\s+SchemaVersion\s*\(", re.IGNORECASE
)

# Documented per-file exceptions.
_ALLOWED_TEXT_AT_COLUMNS = {("SchemaVersion", "AppliedAt")}
# Tables that intentionally sit outside the PascalCase-singular domain rule
# (schema-version bookkeeping is spec-locked).
_META_TABLES = {"SchemaVersion"}


def _migration_files() -> list[Path]:
    files: list[Path] = []
    for tier in TIERS:
        files.extend(sorted((MIGRATIONS_ROOT / tier).glob("*.sql")))
    assert files, f"no migration files found under {MIGRATIONS_ROOT}"
    return files


def _parse_tables(sql: str) -> list[tuple[str, str]]:
    """Return list of (table_name, body) for each CREATE TABLE statement."""
    return [(m.group(1), m.group(2)) for m in _TABLE_RE.finditer(sql)]


def _columns(body: str) -> list[tuple[str, str]]:
    """Extract (name, rest-of-line) for each column line, ignoring INDEX/CHECK-only lines."""
    out: list[tuple[str, str]] = []
    for raw in body.split("\n"):
        line = raw.strip().rstrip(",")
        if not line or line.startswith("--"):
            continue
        # skip table-level constraints
        upper = line.upper()
        if upper.startswith(("PRIMARY KEY", "FOREIGN KEY", "UNIQUE", "CHECK", "CONSTRAINT")):
            continue
        parts = line.split(None, 1)
        if len(parts) < 2:
            continue
        name, rest = parts
        if not re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", name):
            continue
        out.append((name, rest))
    return out


@pytest.fixture(scope="module")
def migrations() -> list[tuple[Path, str, list[tuple[str, str]]]]:
    parsed = []
    for f in _migration_files():
        sql = f.read_text(encoding="utf-8")
        parsed.append((f, sql, _parse_tables(sql)))
    return parsed


def test_migration_files_present() -> None:
    files = _migration_files()
    tiers_seen = {f.parent.name for f in files}
    assert tiers_seen == set(TIERS), f"expected tiers {TIERS}, saw {tiers_seen}"


def test_table_names_are_pascal_singular(migrations) -> None:
    bad: list[str] = []
    for path, _sql, tables in migrations:
        for name, _body in tables:
            if name in _META_TABLES:
                continue
            if not re.match(r"^[A-Z][A-Za-z0-9]*$", name):
                bad.append(f"{path.name}: table {name!r} is not PascalCase")
            elif name.endswith("s") and not name.endswith("ss"):
                # crude plural check; migrations only declare singular names.
                bad.append(f"{path.name}: table {name!r} looks plural")
    assert not bad, "table naming violations:\n" + "\n".join(bad)


def test_primary_keys_are_table_id_integer_autoincrement(migrations) -> None:
    bad: list[str] = []
    for path, _sql, tables in migrations:
        for name, body in tables:
            if name in _META_TABLES:
                continue
            pk_line = None
            for col, rest in _columns(body):
                if col == f"{name}Id":
                    pk_line = rest.upper()
                    break
            if pk_line is None:
                bad.append(f"{path.name}: table {name!r} missing {name}Id column")
                continue
            if "INTEGER" not in pk_line or "PRIMARY KEY" not in pk_line or "AUTOINCREMENT" not in pk_line:
                bad.append(
                    f"{path.name}: {name}.{name}Id must be 'INTEGER PRIMARY KEY AUTOINCREMENT' "
                    f"(got: {pk_line!r})"
                )
    assert not bad, "PK violations:\n" + "\n".join(bad)


def test_at_columns_are_integer_epoch(migrations) -> None:
    bad: list[str] = []
    for path, _sql, tables in migrations:
        for name, body in tables:
            for col, rest in _columns(body):
                if not col.endswith("At"):
                    continue
                if (name, col) in _ALLOWED_TEXT_AT_COLUMNS:
                    continue
                if not re.match(r"^\s*INTEGER\b", rest, re.IGNORECASE):
                    bad.append(f"{path.name}: {name}.{col} must be INTEGER (got: {rest!r})")
    assert not bad, "*At column type violations:\n" + "\n".join(bad)


def test_boolean_columns_have_is_or_has_prefix_and_check(migrations) -> None:
    """Any column whose declaration includes ``CHECK (... IN (0, 1))`` (i.e. a
    boolean) must be named ``Is*`` or ``Has*``. Conversely, ``Is*``/``Has*``
    columns must carry that CHECK. Enforces spec 04 §"Boolean Column Rules"
    and memory §9."""
    bad: list[str] = []
    check_bool_re = re.compile(r"CHECK\s*\(\s*\w+\s+IN\s*\(\s*0\s*,\s*1\s*\)\s*\)", re.IGNORECASE)
    for path, _sql, tables in migrations:
        for name, body in tables:
            for col, rest in _columns(body):
                looks_bool = bool(check_bool_re.search(rest))
                is_named_bool = col.startswith(("Is", "Has"))
                if looks_bool and not is_named_bool:
                    bad.append(f"{path.name}: {name}.{col} has 0/1 CHECK but lacks Is/Has prefix")
                if is_named_bool and not looks_bool:
                    # allow if the column is a plain flag with DEFAULT 0/1 and CHECK IN (0,1);
                    # our regex already caught that. Missing CHECK is the violation.
                    bad.append(f"{path.name}: {name}.{col} named as boolean but missing CHECK IN (0,1)")
    assert not bad, "boolean column violations:\n" + "\n".join(bad)


def test_no_cross_tier_references(migrations) -> None:
    tier_tables: dict[str, set[str]] = {t: set() for t in TIERS}
    for path, _sql, tables in migrations:
        tier = path.parent.name
        for name, _body in tables:
            tier_tables[tier].add(name)
    bad: list[str] = []
    for path, _sql, tables in migrations:
        tier = path.parent.name
        siblings = tier_tables[tier]
        for name, body in tables:
            for ref in _REFERENCES_RE.findall(body):
                if ref not in siblings:
                    bad.append(
                        f"{path.name}: {name} REFERENCES {ref!r} which is not in tier {tier!r}"
                    )
    assert not bad, "cross-tier FK violations (memory §9):\n" + "\n".join(bad)


def test_each_migration_bumps_schema_version(migrations) -> None:
    bad: list[str] = []
    for path, sql, _tables in migrations:
        if not _SCHEMA_VERSION_INSERT_RE.search(sql):
            bad.append(f"{path.name}: missing terminal INSERT INTO SchemaVersion(...) row")
    assert not bad, "SchemaVersion bookkeeping missing:\n" + "\n".join(bad)


def test_transactions_wrap_each_file(migrations) -> None:
    bad: list[str] = []
    for path, sql, _tables in migrations:
        low = sql.lower()
        if "begin;" not in low or "commit;" not in low:
            bad.append(f"{path.name}: not wrapped in BEGIN/COMMIT (spec 26 §1)")
    assert not bad, "transaction wrapping violations:\n" + "\n".join(bad)
