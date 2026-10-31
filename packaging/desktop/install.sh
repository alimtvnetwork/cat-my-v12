#!/usr/bin/env bash
set -Eeuo pipefail

RELEASE_REPO=${RELEASE_REPO:-__RELEASE_REPO__}
RELEASE_TAG=${RELEASE_TAG:-__RELEASE_TAG__}
OS_TYPE=$(uname -s)

if [ "$OS_TYPE" = "Darwin" ]; then
  PLATFORM="macos"
  INSTALL_ROOT=${INSTALL_ROOT:-$HOME/Applications/CAT iVISION}
  APPLICATIONS_ROOT=${APPLICATIONS_ROOT:-$HOME/Applications}
  DESKTOP_ROOT=${DESKTOP_ROOT:-$HOME/Desktop}
  ARCHIVE_PATH=${TMPDIR:-/tmp}/cat-ivision-macos.zip
  DOWNLOAD_URL="https://github.com/$RELEASE_REPO/releases/download/$RELEASE_TAG/control-automation-macos.zip"
else
  PLATFORM="linux"
  INSTALL_ROOT=${INSTALL_ROOT:-${XDG_DATA_HOME:-$HOME/.local/share}/cat-ivision}
  APPLICATIONS_ROOT=${APPLICATIONS_ROOT:-${XDG_DATA_HOME:-$HOME/.local/share}/applications}
  DESKTOP_ROOT=${DESKTOP_ROOT:-${XDG_DESKTOP_DIR:-$HOME/Desktop}}
  ARCHIVE_PATH=${TMPDIR:-/tmp}/cat-ivision-linux.zip
  DOWNLOAD_URL="https://github.com/$RELEASE_REPO/releases/download/$RELEASE_TAG/control-automation-linux.zip"
fi

for command_name in curl unzip; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf 'Required command is missing: %s\n' "$command_name" >&2

    exit 1
  fi
done

printf 'Downloading CAT iVISION %s (%s)...\n' "$RELEASE_TAG" "$PLATFORM"

# aria2c acceleration, like the Gitmap / Antigravity Manager (AGM) installers:
# prefer multi-connection downloading when aria2c is present, fall back to
# curl otherwise.
download_file() {
  local url="$1"
  local output="$2"

  if command -v aria2c >/dev/null 2>&1; then
    printf 'Accelerating download with aria2c (16 connections, 1MB chunks)...\n'
    if aria2c --disable-ipv6=true -x 16 -s 16 -j 16 -k 1M \
      --file-allocation=none --allow-overwrite=true --auto-file-renaming=false \
      --summary-interval=1 --console-log-level=warn \
      --dir="$(dirname "$output")" -o "$(basename "$output")" "$url" \
      && [ -s "$output" ]; then
      return 0
    fi
    printf 'aria2c download did not complete - falling back to curl.\n'
  fi

  curl --fail --location --show-error "$url" --output "$output"
}

download_file "$DOWNLOAD_URL" "$ARCHIVE_PATH"
mkdir -p "$INSTALL_ROOT" "$APPLICATIONS_ROOT"
pkill -f "$INSTALL_ROOT" 2>/dev/null || true
unzip -o "$ARCHIVE_PATH" -d "$INSTALL_ROOT" >/dev/null
chmod +x "$INSTALL_ROOT/start.sh" "$INSTALL_ROOT/runtime/bun" "$INSTALL_ROOT"/*-server "$INSTALL_ROOT"/db-bootstrap "$INSTALL_ROOT"/worker-cli "$INSTALL_ROOT"/processing-cli "$INSTALL_ROOT"/retention-run 2>/dev/null || true

ICON_PATH="$INSTALL_ROOT/frontend/public/images/cat-my-v12-icon.png"

if [ ! -s "$ICON_PATH" ]; then
  ICON_PATH="$INSTALL_ROOT/frontend/public/favicon.ico"
fi

if [ "$PLATFORM" = "macos" ]; then
  # Strip Apple quarantine attributes on extracted executables
  xattr -cr "$INSTALL_ROOT" 2>/dev/null || true

  APP_BUNDLE="$APPLICATIONS_ROOT/CAT iVISION.app"
  mkdir -p "$APP_BUNDLE/Contents/MacOS" "$APP_BUNDLE/Contents/Resources"

  cat >"$APP_BUNDLE/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>cat-ivision</string>
    <key>CFBundleIdentifier</key>
    <string>com.cat.ivision</string>
    <key>CFBundleName</key>
    <string>CAT iVISION</string>
    <key>CFBundleDisplayName</key>
    <string>CAT iVISION</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>11.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

  cat >"$APP_BUNDLE/Contents/MacOS/cat-ivision" <<EOF
#!/usr/bin/env bash
exec bash "$INSTALL_ROOT/start.sh"
EOF
  chmod +x "$APP_BUNDLE/Contents/MacOS/cat-ivision"

  if [ -s "$ICON_PATH" ]; then
    cp "$ICON_PATH" "$APP_BUNDLE/Contents/Resources/AppIcon.png" 2>/dev/null || true
  fi

  if [ -d "$DESKTOP_ROOT" ]; then
    ln -shf "$APP_BUNDLE" "$DESKTOP_ROOT/CAT iVISION.app" 2>/dev/null || true
  fi

  rm -f "$ARCHIVE_PATH"
  printf 'Installation complete. CAT iVISION is available from Applications and your Desktop.\n'
else
  DESKTOP_FILE="$APPLICATIONS_ROOT/cat-ivision.desktop"
  cat >"$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Name=CAT iVISION
Comment=Industrial visual inspection workspace
Exec=bash "$INSTALL_ROOT/start.sh"
Icon=$ICON_PATH
Terminal=false
Categories=Development;Engineering;
Keywords=Inspection;Vision;Automation;CAT;
StartupNotify=true
StartupWMClass=cat-ivision
EOF
  chmod +x "$DESKTOP_FILE"

  if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$APPLICATIONS_ROOT" >/dev/null 2>&1 || true
  fi

  if [ -d "$DESKTOP_ROOT" ]; then
    cp "$DESKTOP_FILE" "$DESKTOP_ROOT/CAT iVISION.desktop"
    chmod +x "$DESKTOP_ROOT/CAT iVISION.desktop"
  fi

  rm -f "$ARCHIVE_PATH"
  printf 'Installation complete. CAT iVISION is available from the application menu and desktop.\n'
fi

"$INSTALL_ROOT/start.sh"
