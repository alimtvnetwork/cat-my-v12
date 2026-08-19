import pytest

from BE.db.connections import get_task_conn


def test_safe_execute_success(tmp_path):
    conn = get_task_conn(db_root=tmp_path)
    res = conn.safe_execute("CREATE TABLE test_tbl (id INTEGER PRIMARY KEY, name TEXT)")
    assert not res.hasError
    assert not res.isFail

    res_insert = conn.safe_execute("INSERT INTO test_tbl (name) VALUES (?)", ("foo",))
    assert not res_insert.hasError
    assert res_insert.rowcount == 1
    assert res_insert.lastrowid == 1

    res_select = conn.safe_execute("SELECT id, name FROM test_tbl WHERE id = ?", (1,))
    assert not res_select.hasError
    row = res_select.fetchone()
    assert row == (1, "foo")

def test_safe_execute_failure(tmp_path):
    conn = get_task_conn(db_root=tmp_path)
    res = conn.safe_execute("SELECT * FROM non_existent_table")
    assert res.isFail
    assert res.hasError
    assert res.error is not None

    with pytest.raises(Exception):
        res.fetchall()

def test_query_result_iter(tmp_path):
    conn = get_task_conn(db_root=tmp_path)
    conn.safe_execute("CREATE TABLE items (val INTEGER)")
    conn.safe_execute("INSERT INTO items VALUES (10)")
    conn.safe_execute("INSERT INTO items VALUES (20)")

    res = conn.safe_execute("SELECT val FROM items ORDER BY val ASC")
    rows = list(res)
    assert rows == [(10,), (20,)]

def test_safe_executemany(tmp_path):
    conn = get_task_conn(db_root=tmp_path)
    conn.safe_execute("CREATE TABLE batch (id INTEGER PRIMARY KEY, item TEXT)")
    res = conn.safe_executemany(
        "INSERT INTO batch (item) VALUES (?)",
        [("a",), ("b",), ("c",)],
    )
    assert not res.hasError
    assert res.rowcount == 3

def test_safe_executescript(tmp_path):
    conn = get_task_conn(db_root=tmp_path)
    script = """
    CREATE TABLE script_tbl (a INT);
    INSERT INTO script_tbl VALUES (1);
    INSERT INTO script_tbl VALUES (2);
    """
    res = conn.safe_executescript(script)
    assert not res.hasError

    res_select = conn.safe_execute("SELECT COUNT(*) FROM script_tbl")
    assert res_select.fetchone()[0] == 2
