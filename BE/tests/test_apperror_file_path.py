from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

def test_apperror_file_path_schema():
    # Calling for_file correctly populates details
    err = AppError.for_file(
        reason="Permission denied",
        path="/etc/hosts",
        operation="Read",
        module="system_loader",
        message="Cannot read file"
    )
    assert err.code == ErrorCode.E_BE_NOT_FOUND
    assert err.details["path"] == "/etc/hosts"
    assert err.details["operation"] == "Read"
    assert err.details["reason"] == "Permission denied"
    assert err.details["module"] == "system_loader"

    # Verify injection into DelegatedServiceErrorStack
    env = err.to_envelope(requested_at="2026-08-01T12:00:00Z")
    assert env.errors is not None
    assert env.errors.DelegatedServiceErrorStack == ["system_loader Read /etc/hosts: Permission denied"]
