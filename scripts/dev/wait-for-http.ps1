param(
    [string[]]$Url,
    [int]$TimeoutSec = 30
)

# F6 mirror: an empty -Url must fail fast with usage, not silently
# succeed (previously the loop returned immediately on zero URLs).
if (-not $Url) {
    throw "Usage: wait-for-http.ps1 -Url <url>... [-TimeoutSec <seconds>]: at least one URL is required."
}

$start = Get-Date
# Multi-URL wait (run-efficiency 6.1.2): every element of $Url is polled
# each interval and the call succeeds when ALL of them answer. A single
# URL behaves exactly as before. Wall time is the slowest service, not
# the sum; each service still gets the full timeout from this call's
# start, and the timeout message names the services still pending.
# Poll interval is 500ms (was 1s): localhost probes are cheap and this
# halves average readiness-detection latency.
$pending = @($Url)
while ($true) {
    $stillPending = @()
    foreach ($u in $pending) {
        try {
            $response = Invoke-WebRequest -Uri $u -UseBasicParsing -ErrorAction Stop
            if ($response.StatusCode -lt 400) {
                continue
            }
        } catch {
            # ignore
        }

        $stillPending += $u
    }

    if ($stillPending.Count -eq 0) {
        return
    }

    $pending = $stillPending

    if ((Get-Date) - $start -gt [timespan]::FromSeconds($TimeoutSec)) {
        throw "Timeout waiting for $($pending -join ', ')"
    }

    Start-Sleep -Milliseconds 500
}
