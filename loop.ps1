$ErrorActionPreference = 'Continue'
New-Item -Path .lovable\temp -ItemType Directory -Force | Out-Null

while ($true) {
    Write-Host "Syncing..."
    git reset --hard HEAD
    git clean -fd .lovable/
    git pull

    $files = Get-ChildItem -Path .lovable\plans\subtasks\96-plan-guideline-audit -Filter *.md | Select-Object -First 3
    if ($null -eq $files -or $files.Count -eq 0) {
        Write-Host "No more tasks!"
        break
    }
    
    $claimed = @()
    $originals = @()
    foreach ($file in $files) {
        $newName = $file.FullName + ".claimed"
        Rename-Item -Path $file.FullName -NewName $newName
        $claimed += $newName
        $originals += $file.FullName
    }
    
    Write-Host "Processing $($claimed.Count) files..."
    $argsStr = $claimed -join " "
    $proc = Start-Process python -ArgumentList "auto_fix.py $argsStr" -Wait -NoNewWindow -PassThru
    if ($proc.ExitCode -ne 0) {
        Write-Host "Python script failed. Trying next batch..."
        # We can't handle these tasks, just leave them as claimed and break or skip.
        # Wait, if we break, we can fix manually.
        break
    }
    
    git add src/
    foreach ($orig in $originals) {
        git rm $orig
    }
    git commit -m "fix: resolve guideline audit batch (auto-ps1)"
    
    $pushed = $false
    while (-not $pushed) {
        git pull --rebase
        if ($LASTEXITCODE -eq 0) {
            git push
            if ($LASTEXITCODE -eq 0) {
                $pushed = $true
            }
        }
        if (-not $pushed) {
            Start-Sleep 1
        }
    }
    
    # move to temp
    foreach ($c in $claimed) {
        Move-Item -Path $c -Destination ".lovable\temp\" -Force
    }
}
