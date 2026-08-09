<#
.SYNOPSIS
    Pester harness for the vision-app PowerShell wrapper fleet.

.DESCRIPTION
    Plan 90 Step 120. Locks the exit-code contract of every wrapper
    under scripts/ps/ so PSScriptAnalyzer (syntax) plus this suite
    (runtime) together gate the fleet.

    Contract pinned here (see also .lovable/memory/26-split-db-cli-cheatsheet.md Sec.12):
      Invoke-DbBootstrap.ps1
        9510 = venv-missing         (no .venv/bin/python or .venv/Scripts/python.exe)
        9511 = python-not-found     (venv python exists, target script missing)
      Invoke-RetentionRun.ps1
        9530 = venv-missing
        9531 = script-missing

    Common.psm1 helpers are pure (no side effects, no exit) and the
    tests assert only path shape, not filesystem executability.

    Anchors:
      spec/21-app/77-cli-powershell-and-release.md
      scripts/ps/Common.psm1
#>

BeforeAll {
    Set-StrictMode -Version Latest
    $ErrorActionPreference = 'Stop'

    # Pester 5/6 isolates Describe scopes; anything Describe/It needs must
    # live on $script: scope inside a BeforeAll or be re-computed per-block.
    $script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..' '..')).Path
    $script:PsRoot   = Join-Path $script:RepoRoot 'scripts/ps'
    $script:PwshExe  = (Get-Process -Id $PID).Path

    function script:New-FakeRepo {
        param([Parameter(Mandatory)][string]$WrapperName)
        $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("vapp-pester-" + [System.Guid]::NewGuid())
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
        $wrapper = Join-Path $FakeRepo "scripts/ps/$WrapperName"
        $stderrPath = Join-Path $FakeRepo 'stderr.log'
        $prevPath = $env:PATH
        try {
            if ($PSBoundParameters.ContainsKey('PathOverride')) { $env:PATH = $PathOverride }
            & $script:PwshExe -NoProfile -NonInteractive -File $wrapper @ExtraArgs 2>$stderrPath | Out-Null
            $code = $LASTEXITCODE
        } finally {
            $env:PATH = $prevPath
        }
        $err = if (Test-Path -LiteralPath $stderrPath) { Get-Content -Raw -LiteralPath $stderrPath } else { '' }
        return @{ ExitCode = $code; Stderr = $err }
    }

    function script:New-FakeSchtasks {
        # Materialise an executable named 'schtasks.exe' in a temp bin dir so
        # POSIX pwsh's `Get-Command schtasks.exe` resolves and Assert-Schtasks
        # passes without needing the real Windows binary. The stub is never
        # actually invoked because Render-Xml exits (9521/9524) earlier.
        param([Parameter(Mandatory)][string]$FakeRepo)
        $binDir = Join-Path $FakeRepo 'fakebin'
        New-Item -ItemType Directory -Force -Path $binDir | Out-Null
        $stub = Join-Path $binDir 'schtasks.exe'
        Set-Content -LiteralPath $stub -Value "#!/bin/sh`nexit 0`n" -NoNewline
        if (-not $IsWindows) { & chmod +x $stub | Out-Null }
        return $binDir
    }

    function script:Expected-Exit {
        # Windows returns the full 32-bit exit code; POSIX truncates to the
        # low byte (`exit N` in a child process, propagated via waitpid).
        # The wrapper's intent (9510/9511/9530/9531) is captured in the
        # `[NNNN]` stderr marker either way; ExitCode assertions honour the
        # host truncation semantics so the test is portable.
        param([Parameter(Mandatory)][int]$Full)
        if ($IsWindows) { return $Full }
        return ($Full -band 0xFF)
    }

    function script:Get-VenvPythonPath {
        param([Parameter(Mandatory)][string]$Root)
        if ($IsWindows) { return (Join-Path $Root '.venv/Scripts/python.exe') }
        return (Join-Path $Root '.venv/bin/python')
    }
}

Describe 'Common.psm1' {
    BeforeAll {
        Import-Module (Join-Path $script:PsRoot 'Common.psm1') -Force
    }

    It 'exports the four documented helpers' {
        $exports = (Get-Module Common).ExportedFunctions.Keys
        $exports | Should -Contain 'Get-VisionAppRepoRoot'
        $exports | Should -Contain 'Get-VisionAppIsWindows'
        $exports | Should -Contain 'Get-VisionAppVenvPython'
        $exports | Should -Contain 'Resolve-VisionAppPwshExe'
    }

    It 'Get-VisionAppRepoRoot returns the checkout root' {
        $root = Get-VisionAppRepoRoot
        (Resolve-Path $root).Path | Should -Be (Resolve-Path $script:RepoRoot).Path
    }

    It 'Get-VisionAppVenvPython returns the OS-appropriate venv path' {
        $p = Get-VisionAppVenvPython -RepoRoot '/tmp/x'
        if ($IsWindows) {
            $p | Should -Match '\.venv[\\/]Scripts[\\/]python\.exe$'
        } else {
            $p | Should -Match '\.venv/bin/python$'
        }
    }

    It 'Get-VisionAppVenvPython does NOT verify existence' {
        # Pure path helper: returns a path even for a non-existent root.
        $p = Get-VisionAppVenvPython -RepoRoot '/definitely/does/not/exist'
        $p | Should -Not -BeNullOrEmpty
    }
}

Describe 'Invoke-DbBootstrap.ps1 exit-code contract' {
    It 'exits 9510 when the venv python is missing' {
        $fake = script:New-FakeRepo -WrapperName 'Invoke-DbBootstrap.ps1'
        try {
            $r = script:Invoke-Wrapper -FakeRepo $fake -WrapperName 'Invoke-DbBootstrap.ps1'
            $r.ExitCode | Should -Be (script:Expected-Exit -Full 9510)
            $r.Stderr   | Should -Match '\[9510\]'
            $r.Stderr   | Should -Match 'venv-missing'
        } finally {
            Remove-Item -Recurse -Force -LiteralPath $fake -ErrorAction SilentlyContinue
        }
    }

    It 'exits 9511 when venv python is present but bin/db-bootstrap.py is missing' {
        $fake = script:New-FakeRepo -WrapperName 'Invoke-DbBootstrap.ps1'
        try {
            $venvPy = script:Get-VenvPythonPath -Root $fake
            New-Item -ItemType Directory -Force -Path (Split-Path -Parent $venvPy) | Out-Null
            New-Item -ItemType File -Force -Path $venvPy | Out-Null
            $r = script:Invoke-Wrapper -FakeRepo $fake -WrapperName 'Invoke-DbBootstrap.ps1'
            $r.ExitCode | Should -Be (script:Expected-Exit -Full 9511)
            $r.Stderr   | Should -Match '\[9511\]'
        } finally {
            Remove-Item -Recurse -Force -LiteralPath $fake -ErrorAction SilentlyContinue
        }
    }
}

Describe 'Invoke-RetentionRun.ps1 exit-code contract' {
    It 'exits 9530 when the venv python is missing' {
        $fake = script:New-FakeRepo -WrapperName 'Invoke-RetentionRun.ps1'
        try {
            $r = script:Invoke-Wrapper -FakeRepo $fake -WrapperName 'Invoke-RetentionRun.ps1'
            $r.ExitCode | Should -Be (script:Expected-Exit -Full 9530)
            $r.Stderr   | Should -Match '\[9530\]'
            $r.Stderr   | Should -Match 'venv-missing'
        } finally {
            Remove-Item -Recurse -Force -LiteralPath $fake -ErrorAction SilentlyContinue
        }
    }

    It 'exits 9531 when venv python is present but bin/retention-run.py is missing' {
        $fake = script:New-FakeRepo -WrapperName 'Invoke-RetentionRun.ps1'
        try {
            $venvPy = script:Get-VenvPythonPath -Root $fake
            New-Item -ItemType Directory -Force -Path (Split-Path -Parent $venvPy) | Out-Null
            New-Item -ItemType File -Force -Path $venvPy | Out-Null
            $r = script:Invoke-Wrapper -FakeRepo $fake -WrapperName 'Invoke-RetentionRun.ps1'
            $r.ExitCode | Should -Be (script:Expected-Exit -Full 9531)
            $r.Stderr   | Should -Match '\[9531\]'
            $r.Stderr   | Should -Match 'script-missing'
        } finally {
            Remove-Item -Recurse -Force -LiteralPath $fake -ErrorAction SilentlyContinue
        }
    }
}

Describe 'Register-RetentionTask.ps1 exit-code contract' {
    # Plan 90 Step 122. Register-RetentionTask.ps1 reserves 9520-9524. This
    # block covers the three deterministic codes that can be reproduced on
    # POSIX pwsh without a signed Windows runner:
    #   9520 = schtasks.exe not on PATH             (Assert-Schtasks)
    #   9521 = template / venv-python / wrapper missing  (Render-Xml preflight)
    #   9524 = neither pwsh.exe nor powershell.exe found (Resolve-PwshExe)
    # 9522 (renderer rejected knobs) and 9523 (schtasks /Create failed) are
    # deferred: 9522 needs a working venv python + BE.app import graph, 9523
    # needs a schtasks stub that returns non-zero AND a writable %TEMP% shape,
    # both of which land with the signed-runner release workflow (Step 121+).

    It 'exits 9520 when schtasks.exe is not on PATH' {
        $fake = script:New-FakeRepo -WrapperName 'Register-RetentionTask.ps1'
        try {
            $r = script:Invoke-Wrapper -FakeRepo $fake -WrapperName 'Register-RetentionTask.ps1' `
                -PathOverride '' -ExtraArgs @('-Install')
            $r.ExitCode | Should -Be (script:Expected-Exit -Full 9520)
            $r.Stderr   | Should -Match '\[9520\]'
            $r.Stderr   | Should -Match 'schtasks\.exe not found'
        } finally {
            Remove-Item -Recurse -Force -LiteralPath $fake -ErrorAction SilentlyContinue
        }
    }

    It 'exits 9521 when the task-XML template is missing' {
        $fake = script:New-FakeRepo -WrapperName 'Register-RetentionTask.ps1'
        try {
            $bin  = script:New-FakeSchtasks -FakeRepo $fake
            # Populate venv python + wrapper file so those two 9521 branches
            # don't fire first; template is intentionally absent.
            $venvPy = script:Get-VenvPythonPath -Root $fake
            New-Item -ItemType Directory -Force -Path (Split-Path -Parent $venvPy) | Out-Null
            New-Item -ItemType File -Force -Path $venvPy | Out-Null
            New-Item -ItemType File -Force -Path (Join-Path $fake 'scripts/ps/Invoke-RetentionRun.ps1') -ErrorAction SilentlyContinue | Out-Null
            $r = script:Invoke-Wrapper -FakeRepo $fake -WrapperName 'Register-RetentionTask.ps1' `
                -PathOverride $bin -ExtraArgs @('-Install')
            $r.ExitCode | Should -Be (script:Expected-Exit -Full 9521)
            $r.Stderr   | Should -Match '\[9521\]'
            $r.Stderr   | Should -Match 'template missing'
        } finally {
            Remove-Item -Recurse -Force -LiteralPath $fake -ErrorAction SilentlyContinue
        }
    }

    It 'exits 9524 when neither pwsh.exe nor powershell.exe is on PATH' {
        $fake = script:New-FakeRepo -WrapperName 'Register-RetentionTask.ps1'
        try {
            $bin  = script:New-FakeSchtasks -FakeRepo $fake
            # All three Render-Xml preflight artifacts present so we reach
            # Resolve-PwshExe. PATH contains only the fake schtasks dir, so
            # `Get-Command pwsh.exe` and `powershell.exe` both miss.
            $venvPy = script:Get-VenvPythonPath -Root $fake
            New-Item -ItemType Directory -Force -Path (Split-Path -Parent $venvPy) | Out-Null
            New-Item -ItemType File -Force -Path $venvPy | Out-Null
            New-Item -ItemType Directory -Force -Path (Join-Path $fake 'packaging/windows') | Out-Null
            Set-Content -LiteralPath (Join-Path $fake 'packaging/windows/vision-app-retention-task.xml.tmpl') -Value '<Task/>'
            Set-Content -LiteralPath (Join-Path $fake 'scripts/ps/Invoke-RetentionRun.ps1') -Value '# stub'
            $r = script:Invoke-Wrapper -FakeRepo $fake -WrapperName 'Register-RetentionTask.ps1' `
                -PathOverride $bin -ExtraArgs @('-Install')
            $r.ExitCode | Should -Be (script:Expected-Exit -Full 9524)
            $r.Stderr   | Should -Match '\[9524\]'
            $r.Stderr   | Should -Match 'neither pwsh\.exe nor powershell\.exe'
        } finally {
            Remove-Item -Recurse -Force -LiteralPath $fake -ErrorAction SilentlyContinue
        }
    }
}
