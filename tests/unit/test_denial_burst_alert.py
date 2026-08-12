import pytest
import time
from app.core.security.remediation import DenialRateLimiter
from app.core.security.audit_sink import AuditSink, CODE_ROLE_DENIED, CODE_DENIAL_BURST_ALERT
import sqlite3

def test_denial_burst_alert_p99_crossing():
    conn = sqlite3.connect(":memory:")
    sink = AuditSink(conn)
    limiter = DenialRateLimiter(sink)
    now = 1750000000
    
    # 3 denials (below 4)
    sink.record(CODE_ROLE_DENIED, "sub", user_id="u1")
    sink.record(CODE_ROLE_DENIED, "sub", user_id="u1")
    sink.record(CODE_ROLE_DENIED, "sub", user_id="u1")
    
    alerts = limiter.scan(now=now)
    assert len(alerts) == 0
    emitted = sink.query(code=CODE_DENIAL_BURST_ALERT)
    assert len(emitted) == 0

    # 4th denial (reaches 4) -> should trigger alert for 1m, 5m, 15m
    sink.record(CODE_ROLE_DENIED, "sub", user_id="u1")
    limiter.scan(now=now)
    emitted = sink.query(code=CODE_DENIAL_BURST_ALERT)
    assert len(emitted) == 3 # 1m, 5m, 15m
    
    # Check deduplication -> scanning again does not emit more
    limiter.scan(now=now)
    emitted2 = sink.query(code=CODE_DENIAL_BURST_ALERT)
    assert len(emitted2) == 3
