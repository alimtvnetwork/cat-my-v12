import { describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as path from "path";

describe("Specification 84: Button Functionality and User Experience Improvement", () => {
  const rootPath = path.resolve(__dirname, "../../src/routes/__root.tsx");
  const buttonsPath = path.resolve(__dirname, "../../src/components/layout/WindowControlButtons.tsx");
  const shutdownPath = path.resolve(__dirname, "../../BE/routes/shutdown.py");
  const runPs1Path = path.resolve(__dirname, "../../run.ps1");

  test("enforces pre-hydration splash screen with version badge and spinner in __root.tsx", () => {
    const content = fs.readFileSync(rootPath, "utf-8");

    expect(content).toContain('id="app-pre-hydration-splash"');
    expect(content).toContain("CAT iVISION");
    expect(content).toContain("APP_VERSION_INFO.version");
    expect(content).toContain("cat-splash-spinner");
    expect(content).toContain("cat-splash-badge");
  });

  test("enforces smooth hydration fade-out and unmount of splash screen", () => {
    const content = fs.readFileSync(rootPath, "utf-8");

    expect(content).toContain('document.getElementById("app-pre-hydration-splash")');
    expect(content).toContain("splash.remove()");
    expect(content).toContain("splash.style.opacity = \"0\"");
  });

  test("eliminates requestFullscreen from default desktop maximize in WindowControlButtons", () => {
    const content = fs.readFileSync(buttonsPath, "utf-8");

    // In desktop mode, WindowControlButtons must call /window/maximize without triggering the Esc banner
    expect(content).toContain("fetch(`${baseUrl}/window/maximize`");
    expect(content).toContain("Avoid document.documentElement.requestFullscreen()");
    expect(content).not.toContain("const fullscreenRequest = document.fullscreenElement");
  });

  test("captures errors in useErrorStore without silent catch blocks", () => {
    const content = fs.readFileSync(buttonsPath, "utf-8");

    expect(content).toContain("useErrorStore.getState().captureError");
    expect(content).toContain("E_WINDOW_MINIMIZE");
    expect(content).toContain("E_WINDOW_MAXIMIZE");
    expect(content).toContain("E_WINDOW_CLOSE");
    expect(content).toContain("E_WINDOW_SHUTDOWN");
  });

  test("enforces run.ps1 uses --start-maximized instead of --start-fullscreen", () => {
    const content = fs.readFileSync(runPs1Path, "utf-8");

    expect(content).toContain("'--start-maximized'");
    expect(content).not.toContain("'--start-fullscreen'");
  });

  test("enforces run.ps1 suppresses raw JSON dumps from db-bootstrap", () => {
    const content = fs.readFileSync(runPs1Path, "utf-8");

    expect(content).toContain("-RedirectStandardOutput $dbOutLog -RedirectStandardError $dbErrLog");
    expect(content).not.toContain("$dbOutput = & uv run --project BE python bin\\db-bootstrap.py 2>&1");
  });

  test("enforces BE/routes/shutdown.py attaches to interactive desktop and handles Win32 calls", () => {
    const content = fs.readFileSync(shutdownPath, "utf-8");

    expect(content).toContain("OpenDesktopW");
    expect(content).toContain("SetThreadDesktop");
    expect(content).toContain("EnumDesktopWindows");
    expect(content).toContain("SW_FORCEMINIMIZE");
    expect(content).toContain("SW_MINIMIZE");
    expect(content).toContain("SW_MAXIMIZE");
    expect(content).toContain("SW_RESTORE");
    expect(content).toContain("taskkill");
  });
});
