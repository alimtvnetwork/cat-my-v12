import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

describe("Specification 82: Menu Glitch & Window Controls Verification", () => {
  const shellPath = path.resolve(process.cwd(), "src/components/layout/StandardAppShell.tsx");
  const winControlPath = path.resolve(process.cwd(), "src/components/layout/WindowControlButtons.tsx");
  const runPs1Path = path.resolve(process.cwd(), "run.ps1");
  const shutdownPyPath = path.resolve(process.cwd(), "BE/routes/shutdown.py");

  const shellContent = fs.readFileSync(shellPath, "utf-8");
  const winControlContent = fs.readFileSync(winControlPath, "utf-8");
  const runPs1Content = fs.readFileSync(runPs1Path, "utf-8");
  const shutdownPyContent = fs.readFileSync(shutdownPyPath, "utf-8");

  it("enforces DropdownMenuContent avoids collisions = false to lock directly beneath trigger button", () => {
    expect(shellContent).toContain('avoidCollisions={false}');
    expect(shellContent).toContain('side="bottom"');
    expect(shellContent).toContain('align="start"');
  });

  it("enforces hover stability with transition-colors instead of layout-shifting transitions", () => {
    expect(shellContent).toContain("transition-colors focus-visible:outline-none");
  });

  it("removes misleading Alt+F4 badge from menu exit item", () => {
    expect(shellContent).not.toContain(">Alt+F4<");
  });

  it("removes browser blocked Alt+F4 toast from WindowControlButtons", () => {
    expect(winControlContent).not.toContain("Browser blocked the automatic close");
    expect(winControlContent).not.toContain("Close this browser window now (Alt+F4)");
  });

  it("implements loopback /window/minimize, /window/maximize, and /window/close in backend", () => {
    expect(shutdownPyContent).toContain('@router.post("/window/minimize")');
    expect(shutdownPyContent).toContain('@router.post("/window/maximize")');
    expect(shutdownPyContent).toContain('@router.post("/window/close")');
    expect(shutdownPyContent).toContain("_minimize_window()");
    expect(shutdownPyContent).toContain("_toggle_maximize_window()");
    expect(shutdownPyContent).toContain("_close_window()");
  });

  it("wires WindowControlButtons to native loopback endpoints", () => {
    expect(winControlContent).toContain("`${baseUrl}/window/minimize`");
    expect(winControlContent).toContain("`${baseUrl}/window/maximize`");
    expect(winControlContent).toContain("`${baseUrl}/window/close`");
  });

  it("polishes run.ps1 with GitMap-grade ANSI double-border banner and supervision loop", () => {
    expect(runPs1Content).toContain("[cat]");
    expect(runPs1Content).toContain("CAT iVISION");
    expect(runPs1Content).toContain("Supervision Active");
    expect(runPs1Content).toContain("Write-StepOk");
    expect(runPs1Content).toContain("Write-StepAction");
    expect(runPs1Content).toContain("Write-StepInfo");
  });
});
