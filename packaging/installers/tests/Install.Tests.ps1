#Requires -Version 5.1
# Plan 90 Step 91 - Pester acceptance for packaging/installers/install.ps1.
#
# Scope: the "release-side" surface the plan text names -DryRun, -Uninstall,
# -Force, -Version, and the checksum failure branch. Because install.ps1 is
# the Plan 90 Step 106 orchestrator (see assets/issues/24-*), the parameters
# map as follows:
#   -DryRun          -> -WhatIf (CmdletBinding SupportsShouldProcess)
#   -Uninstall       -> -Uninstall (native switch)
#   -Force           -> -ForceReinstall / -AllowDowngrade (native switches)
#   -Version         -> -AppVersion <string> (native param, env APP_VERSION)
#   checksum branch  -> exit 9533 when SHA256SUMS.txt covers a tampered exe
#
# Anchors:
#   packaging/installers/install.ps1 (Step 106/124/125/129)
#   spec/21-app/77-cli-powershell-and-release.md
#   assets/issues/24-install-sh-spec-16-03-deviation.md

Describe 'install.ps1 - static contract' {
    BeforeAll {
        $script:InstallScript = Join-Path (Split-Path -Parent $PSScriptRoot) 'install.ps1'
        $script:Source = Get-Content -LiteralPath $script:InstallScript -Raw
    }

    It 'exists on disk' {
        Test-Path -LiteralPath $script:InstallScript | Should -BeTrue
    }

    It 'parses without syntax errors' {
        $tokens = $null
        $errors = $null
        [System.Management.Automation.Language.Parser]::ParseFile(
            $script:InstallScript, [ref]$tokens, [ref]$errors) | Out-Null
        $errors.Count | Should -Be 0
    }

    It 'declares SupportsShouldProcess so -WhatIf is honoured' {
        $script:Source | Should -Match 'SupportsShouldProcess\s*=\s*\$true'
    }

    It 'declares the -Uninstall parameter set' {
        $script:Source | Should -Match "ParameterSetName\s*=\s*'Uninstall'"
        $script:Source | Should -Match '\[switch\]\$Uninstall'
    }

    It 'declares the force-family switches (-ForceReinstall, -AllowDowngrade)' {
        $script:Source | Should -Match '\[switch\]\$ForceReinstall'
        $script:Source | Should -Match '\[switch\]\$AllowDowngrade'
    }

    It 'declares -AppVersion / -BinariesDir version knobs' {
        $script:Source | Should -Match '\[string\]\$AppVersion'
        $script:Source | Should -Match '\[string\]\$BinariesDir'
    }

    It 'declares the wrapper-only exit codes (9530-9536, 2)' {
        foreach ($code in 9530, 9531, 9532, 9533, 9534, 9535, 9536, 2) {
            $script:Source | Should -Match ([regex]::Escape("$code"))
        }
    }

    It 'invokes the four python entry scripts (verify-sums, doctor, upgrade-plan, record)' {
        $script:Source | Should -Match 'install-verify-sums\.py'
        $script:Source | Should -Match 'install-doctor\.py'
        $script:Source | Should -Match 'install-upgrade-plan\.py'
        $script:Source | Should -Match 'install-record\.py'
    }
}

Describe 'install.ps1 - runtime guardrails (no venv required)' {
    BeforeAll {
        $script:InstallScript = Join-Path (Split-Path -Parent $PSScriptRoot) 'install.ps1'
    }

    It '-Install without -BinariesDir exits with the missing-python or checksum-config guard (non-zero)' {
        # Runs without a real venv on most dev boxes; asserts the script
        # refuses to silently proceed. Accepts 9530 (venv missing) or 2
        # (usage) depending on host state.
        $env:APP_BINARIES_DIR = ''
        pwsh -NoProfile -File $script:InstallScript -Install *> $null
        $LASTEXITCODE | Should -Not -Be 0
    }

    It '-WhatIf -Uninstall does not touch install.json' {
        $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("install-ps1-whatif-" + [guid]::NewGuid())
        New-Item -ItemType Directory -Path $tmp -Force | Out-Null
        try {
            $env:APP_INSTALL_ROOT = $tmp
            pwsh -NoProfile -File $script:InstallScript -Uninstall -WhatIf *> $null
            Test-Path (Join-Path $tmp 'install.json') | Should -BeFalse
        } finally {
            $env:APP_INSTALL_ROOT = $null
            Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

Describe 'install.ps1 - checksum failure branch' -Skip:(-not (Test-Path (Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) '.venv/Scripts/python.exe'))) {
    It 'exits 9533 when SHA256SUMS.txt does not match the on-disk bytes' {
        $script:InstallScript = Join-Path (Split-Path -Parent $PSScriptRoot) 'install.ps1'
        $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("install-ps1-checksum-" + [guid]::NewGuid())
        New-Item -ItemType Directory -Path $tmp -Force | Out-Null
        try {
            # tampered inventory: SHA256SUMS advertises a hash that does not
            # match the actual byte content of worker-cli.exe
            Set-Content -LiteralPath (Join-Path $tmp 'worker-cli.exe') -Value 'FAKE-BINARY' -NoNewline
            $bogus = ('0' * 64) + '  worker-cli.exe'
            Set-Content -LiteralPath (Join-Path $tmp 'SHA256SUMS.txt') -Value $bogus -NoNewline
            $env:APP_BINARIES_DIR = $tmp
            pwsh -NoProfile -File $script:InstallScript -Install -VerifyOnly *> $null
            $LASTEXITCODE | Should -Be 9533
        } finally {
            $env:APP_BINARIES_DIR = $null
            Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}
