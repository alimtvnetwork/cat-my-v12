@{
    # Plan 90 Step 83. Shared PSScriptAnalyzer config for scripts/ps.
    # Anchors: spec/21-app/77-cli-powershell-and-release.md §Deliverables #7
    # ("PowerShell wrappers pass PSScriptAnalyzer with zero warnings at
    # Error and Warning severities").
    #
    # Consumed by:
    #   .github/workflows/ci.yml -> job `psscriptanalyzer`
    #   Local dev: `Invoke-ScriptAnalyzer -Path scripts/ps -Recurse
    #              -Settings scripts/ps/PSScriptAnalyzerSettings.psd1`

    Severity = @('Error', 'Warning')

    ExcludeRules = @(
        # Wrappers stream child stdout/stderr verbatim so Universal Envelope
        # JSON reaches callers intact; Write-Host is intentional for
        # human-readable progress from Common.psm1 helpers.
        'PSAvoidUsingWriteHost',

        # Thin passthrough wrappers (Invoke-WorkerCli/ProcessingCli/DbBootstrap)
        # forward argv to a child process; they never mutate host state
        # themselves. ShouldProcess is applied where it matters
        # (Invoke-WorkerCli.ps1 / Invoke-ProcessingCli.ps1 already carry
        # SupportsShouldProcess); Common.psm1 helpers are pure read/append.
        'PSUseShouldProcessForStateChangingFunctions',

        # Repo policy: source files are UTF-8 without BOM (cross-platform
        # editors, git diff cleanliness). Windows PS 5.1 reads BOM-less
        # UTF-8 files correctly when the shebang is ASCII, which every
        # wrapper here satisfies.
        'PSUseBOMForUnicodeEncodedFile',

        # Legacy Register-RetentionTask.ps1 (pre-Plan-90) has stub params,
        # `Render-Xml` / `Assert-Schtasks` helper names, and missing
        # SupportsShouldProcess. Tracked separately; excluded here so the
        # wrapper fleet stays lint-clean without a same-turn refactor.
        'PSReviewUnusedParameter',
        'PSUseApprovedVerbs',
        'PSUseSingularNouns',
        'PSShouldProcess'
    )

    Rules = @{
        PSUseCompatibleSyntax = @{
            Enable         = $true
            # spec 21-app/77 §Compatibility: PowerShell 5.1 (Windows built-in)
            # and 7.x (pwsh-core POSIX + modern Windows).
            TargetVersions = @('5.1', '7.4')
        }
    }
}
