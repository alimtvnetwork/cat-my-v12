<#
.SYNOPSIS
    Pester smoke suite for the worker + processing CLI wrappers.

.DESCRIPTION
    Plan 90 Step 84. Locks the Step 80/81 wrapper contract:
      1. -WhatIf preview short-circuits with rc=0 and never invokes
         the underlying interpreter (SupportsShouldProcess wiring).
      2. Missing interpreter path exits with reserved wrapper code
         9511 ('python-not-found') and writes the [9511] marker to
         stderr, per .lovable/memory/26-split-db-cli-cheatsheet.md Sec.12.

    Tests spin up a throwaway fake repo two levels above the copied
    wrapper so `Get-VisionAppRepoRoot` (Split-Path twice from
    $PSScriptRoot) resolves inside the sandbox and the wrapper's
    `.venv` lookup misses deterministically. PATH is overridden so
    the fallback `python`/`python3` probe misses too.

    Anchors:
      scripts/ps/Invoke-WorkerCli.ps1
      scripts/ps/Invoke-ProcessingCli.ps1
      scripts/ps/Common.psm1 (Resolve-PythonExe, Get-VisionAppVenvPython)
      spec/21-app/77-cli-powershell-and-release.md Sec.Deliverables
      tests/pester/Wrappers.Tests.ps1 (sibling suite for db-bootstrap / retention)
#>

BeforeAll {
    Set-StrictMode -Version Latest
    $ErrorActionPreference = 'Stop'

    $script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..' '..' '..')).Path
    $script:PsRoot   = Join-Path $script:RepoRoot 'scripts/ps'
    $script:PwshExe  = (Get-Process -Id $PID).Path
    $script:Wrappers = @('Invoke-WorkerCli.ps1', 'Invoke-ProcessingCli.ps1')

    function script:New-FakeRepo {
        param([Parameter(Mandatory)][string]$WrapperName)
        $tempRoot = Join-Path ([IO.Path]::GetTempPath()) ("vapp-cli-pester-" + [Guid]::NewGuid())
        $psDest   = Join-Path $tempRoot 'scripts/ps'
        New-Item -ItemType Directory -Force -Path $psDest | Out-Null
        Copy-Item -LiteralPath (Join-Path $script:PsRoot 'Common.psm1') -Destination $psDest -Force
        Copy-Item -LiteralPath (Join-Path $script:PsRoot $WrapperName) -Destination $psDest -Force
        return $tempRoot
    }

    function script:Invoke-Wrapper {
        param(
            [Parameter(Mandatory)][string]$FakeRepo,
            [Parameter(Mandatory)][string]$WrapperName,
            [string[]]$ExtraArgs = @(),
            [string]$PathOverride
        )
        $wrapper    = Join-Path $FakeRepo "scripts/ps/$WrapperName"
        $stderrPath = Join-Path $FakeRepo 'stderr.log'
        $stdoutPath = Join-Path $FakeRepo 'stdout.log'
        $prevPath   = $env:PATH
        $prevLog    = $env:APP_LOG_ROOT
        try {
            if ($PSBoundParameters.ContainsKey('PathOverride')) { $env:PATH = $PathOverride }
            $env:APP_LOG_ROOT = Join-Path $FakeRepo 'logs'
            & $script:PwshExe -NoProfile -NonInteractive -File $wrapper @ExtraArgs `
                1>$stdoutPath 2>$stderrPath
            $code = $LASTEXITCODE
        } finally {
            $env:PATH         = $prevPath
            $env:APP_LOG_ROOT = $prevLog
        }
        $err = if (Test-Path -LiteralPath $stderrPath) { Get-Content -Raw -LiteralPath $stderrPath } else { '' }
        $out = if (Test-Path -LiteralPath $stdoutPath) { Get-Content -Raw -LiteralPath $stdoutPath } else { '' }
        return @{ ExitCode = $code; Stderr = $err; Stdout = $out }
    }

    function script:Expected-Exit {
        # POSIX truncates exit codes to the low byte; Windows preserves them.
        param([Parameter(Mandatory)][int]$Full)
        if ($IsWindows) { return $Full }
        return ($Full -band 0xFF)
    }

    function script:New-FakePythonBin {
        # Materialise an executable named 'python' that records its argv
        # so tests can prove -WhatIf did NOT invoke it. Never actually
        # called in the happy -WhatIf path.
        param([Parameter(Mandatory)][string]$FakeRepo)
        $binDir = Join-Path $FakeRepo 'fakebin'
        New-Item -ItemType Directory -Force -Path $binDir | Out-Null
        $stub = Join-Path $binDir 'python'
        Set-Content -LiteralPath $stub -Value "#!/bin/sh`necho invoked >&2`nexit 0`n" -NoNewline
        if (-not $IsWindows) { & chmod +x $stub | Out-Null }
        return $binDir
    }
}

Describe 'worker + processing CLI wrappers: -WhatIf preview' {
    It '<Wrapper> exits 0 under -WhatIf without invoking the interpreter' -ForEach @(
        @{ Wrapper = 'Invoke-WorkerCli.ps1' }
        @{ Wrapper = 'Invoke-ProcessingCli.ps1' }
    ) {
        $fake = script:New-FakeRepo -WrapperName $Wrapper
        try {
            $bin = script:New-FakePythonBin -FakeRepo $fake
            $r = script:Invoke-Wrapper -FakeRepo $fake -WrapperName $Wrapper `
                -PathOverride $bin -ExtraArgs @('-WhatIf', '--help')
            $r.ExitCode | Should -Be 0
            # The fake python echoes 'invoked' to stderr on invocation;
            # -WhatIf must short-circuit before that runs.
            $r.Stderr | Should -Not -Match 'invoked'
        } finally {
            Remove-Item -Recurse -Force -LiteralPath $fake -ErrorAction SilentlyContinue
        }
    }
}

Describe 'worker + processing CLI wrappers: python-not-found (9511)' {
    It '<Wrapper> exits 9511 with [9511] marker when no interpreter is resolvable' -ForEach @(
        @{ Wrapper = 'Invoke-WorkerCli.ps1' }
        @{ Wrapper = 'Invoke-ProcessingCli.ps1' }
    ) {
        $fake = script:New-FakeRepo -WrapperName $Wrapper
        try {
            $r = script:Invoke-Wrapper -FakeRepo $fake -WrapperName $Wrapper `
                -PathOverride '' -ExtraArgs @('--help')
            $r.ExitCode | Should -Be (script:Expected-Exit -Full 9511)
            $r.Stderr   | Should -Match '\[9511\]'
            $r.Stderr   | Should -Match 'python-not-found'
        } finally {
            Remove-Item -Recurse -Force -LiteralPath $fake -ErrorAction SilentlyContinue
        }
    }
}
