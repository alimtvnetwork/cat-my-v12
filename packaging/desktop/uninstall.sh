#!/usr/bin/env bash
# Uninstalls CAT iVISION from this machine:
# removes the install dir, the .desktop entry, and the desktop copy.
set -Eeuo pipefail

INSTALL_ROOT=${XDG_DATA_HOME:-$HOME/.local/share}/cat-ivision
APPLICATIONS_ROOT=${XDG_DATA_HOME:-$HOME/.local/share}/applications
DESKTOP_ROOT=${XDG_DESKTOP_DIR:-$HOME/Desktop}

printf 'Uninstalling CAT iVISION...\n'

# Best-effort: stop the running app before deleting files.
pkill -f "$INSTALL_ROOT" 2>/dev/null || true
pkill -x start.sh 2>/dev/null || true

if [ -f "$APPLICATIONS_ROOT/cat-ivision.desktop" ]; then
  rm -f "$APPLICATIONS_ROOT/cat-ivision.desktop"
  printf 'Removed application menu entry.\n'
fi

if [ -f "$DESKTOP_ROOT/CAT iVISION.desktop" ]; then
  rm -f "$DESKTOP_ROOT/CAT iVISION.desktop"
  printf 'Removed desktop shortcut.\n'
fi

if [ -d "$INSTALL_ROOT" ]; then
  rm -rf "$INSTALL_ROOT"
  printf 'Removed install directory: %s\n' "$INSTALL_ROOT"
else
  printf 'Install directory not found - nothing to remove there.\n'
fi

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$APPLICATIONS_ROOT" >/dev/null 2>&1 || true
fi

printf 'Uninstall complete.\n'
