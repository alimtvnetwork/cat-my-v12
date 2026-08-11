param(
    [string]$Url,
    [int]$TimeoutSec = 30
)

$start = Get-Date
while ($true) {
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -lt 400) {
            return
        }
    } catch {
        # ignore
    }
    
    if ((Get-Date) - $start -gt [timespan]::FromSeconds($TimeoutSec)) {
        throw "Timeout waiting for $Url"
    }
    Start-Sleep -Seconds 1
}
