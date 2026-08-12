import pytest
import time
from app.core.security.audit_sink import AuditSink
from app.core.security.remediation import DenialRateLimiter, CODE_ROLE_DENIED

def test_denial_burst_threshold_update():
    sink = AuditSink(":memory:")
    limiter = DenialRateLimiter(sink=sink, threshold=4, window_seconds=60)
    
    user_id = "test_user"
    now = int(time.time())
    
    # Fire 3 events (old boundary was 4 to NOT fire, 5 to fire)
    for _ in range(3):
        sink.record(CODE_ROLE_DENIED, f"user:{user_id}", user_id=user_id, ts=now)
    
    alerts = limiter.scan(now=now)
    assert len(alerts) == 0, "Should not fire at 3"
    
    # Fire 4th event, now it should fire because threshold is 4 (old threshold was 5)
    sink.record(CODE_ROLE_DENIED, f"user:{user_id}", user_id=user_id, ts=now)
    alerts = limiter.scan(now=now)
    assert len(alerts) == 1, "Should fire at new threshold 4"
    assert alerts[0].user_id == user_id
    assert alerts[0].threshold == 4
