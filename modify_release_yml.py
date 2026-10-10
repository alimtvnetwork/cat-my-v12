import re

with open('.github/workflows/release.yml', 'r') as f:
    content = f.read()

# 1. Add bun installation and frontend compilation
bun_steps = """
      - name: Install Bun & Build Frontend
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      
      - name: Compile Frontend
        run: |
          bun install --frozen-lockfile
          bun run build
          # Compile to executable (assumes nitro server output)
          bun build --compile .output/server/index.mjs --outfile dist/control-automation-frontend${{ matrix.exe_suffix }}
        shell: bash
"""
content = content.replace("      - name: Compute SHA256SUMS.txt", bun_steps + "\n      - name: Compute SHA256SUMS.txt")

# 2. Add frontend to SHA256SUMS logic
hash_logic_old = """              digest = hashlib.sha256(exe.read_bytes()).hexdigest()
              lines.append(f"{digest}  {exe.name}")"""
hash_logic_new = """              digest = hashlib.sha256(exe.read_bytes()).hexdigest()
              lines.append(f"{digest}  {exe.name}")
          
          # Add frontend executable
          frontend_exe = Path("dist") / f"control-automation-frontend{suffix}"
          if frontend_exe.is_file():
              digest = hashlib.sha256(frontend_exe.read_bytes()).hexdigest()
              lines.append(f"{digest}  {frontend_exe.name}")"""
content = content.replace(hash_logic_old, hash_logic_new)

# 3. Zip the executables in the checksum job
zip_logic_old = """          (cd release && sha256sum *-* > SHA256SUMS.txt)
          cat release/SHA256SUMS.txt"""
zip_logic_new = """          (cd release && sha256sum *-* > SHA256SUMS.txt)
          
          # Zip all binaries into OS-specific packages
          (cd release && zip control-automation-windows.zip windows-*)
          (cd release && zip control-automation-linux.zip linux-*)
          
          cat release/SHA256SUMS.txt"""
content = content.replace(zip_logic_old, zip_logic_new)

# 4. Generate install.ps1 in the publish job
publish_steps_old = """      - name: Create draft GitHub Release"""
publish_steps_new = """      - name: Generate install.ps1
        run: |
          echo "Write-Host 'Downloading Control Automation...'" > release/install.ps1
          echo "Invoke-WebRequest -Uri https://github.com/${{ github.repository }}/releases/download/${{ github.event.inputs.release_tag }}/control-automation-windows.zip -OutFile control-automation.zip" >> release/install.ps1
          echo "Expand-Archive -Path control-automation.zip -DestinationPath \$env:LOCALAPPDATA\ControlAutomation -Force" >> release/install.ps1
          echo "\$WshShell = New-Object -comObject WScript.Shell" >> release/install.ps1
          echo "\$Shortcut = \$WshShell.CreateShortcut(\"\$Home\Desktop\Control Automation.lnk\")" >> release/install.ps1
          echo "\$Shortcut.TargetPath = \"\$env:LOCALAPPDATA\ControlAutomation\windows-control-automation-frontend.exe\"" >> release/install.ps1
          echo "\$Shortcut.Save()" >> release/install.ps1
          echo "Write-Host 'Installation Complete! Desktop shortcut created.'" >> release/install.ps1

      - name: Create draft GitHub Release"""
content = content.replace(publish_steps_old, publish_steps_new)

with open('.github/workflows/release.yml', 'w') as f:
    f.write(content)

print("Modification complete.")
