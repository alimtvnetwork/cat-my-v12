# Chromium Shell Extension

This is the MV3 browser extension for the app shell.

## Installation Steps

1. Open Google Chrome or Chromium.
2. Navigate to `chrome://extensions`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked**.
5. Select the `chromium-shell` directory.

## Packaging

To package the extension into a zip file for distribution, run:

```bash
zip -r public/app-shell.zip chromium-shell/
```

_(Or use `nix run nixpkgs#zip -- -r public/app-shell.zip .` from within the folder as specified in the plans)_
