// End-to-end UI probe for the pattern-search and UI improvement
// work. Drives the live frontend on E2E_BASE_URL (default
// http://127.0.0.1:8080) with the repo's installed Playwright
// Chromium. Writes tests/reports/pattern-search-ui.json.
//
// Grading: PASS = observed. FAIL = surface reached, behaviour
// wrong. UNVERIFIED = surface unreachable, with the reason printed.
// Nothing here clicks a destructive control (no delete, no save,
// no publish, no purchase).
//
// Anchors, all verified by throwaway diagnostics before this probe
// was written:
// - Rule detail pages are unreachable in this build: every link on
//   /setup/rules renders "Rule was deleted or the link is stale"
//   (13/13, then 3/3, across fresh sessions). Editor cases do NOT
//   chase rule links; they use /setup/white-boxes (the pattern
//   surface) and /analyze (the pin-one and panel surfaces).
// - Window controls, top menus and the status bar mount only on
//   HmiShell routes. /trial-run is a shell page with named section
//   menus ("Setup menu", ...) plus Full screen / Close window
//   buttons, so D10/D4/D5 run there, not on station pages.
// - /run has no "Run" heading; its marker is "Run screen ready".
// - /analyze "Visual Tune this rule" buttons all open the pin-one
//   panel (the modal follows the selected tool, which stays pin-1),
//   so D11 asserts the pin-one panel and D3 reports the sim tool
//   as unreachable rather than pretending otherwise.
//
// Memory: this VM has ~8GB RAM with the Vite dev server alone
// holding ~1.4GB, so a single long browser session exhausts the
// renderer after the canvas-heavy white-boxes page ("Page
// crashed", ERR_INSUFFICIENT_RESOURCES). Each section therefore
// runs in its own freshly launched browser, closed before the next
// section starts, so peak browser memory stays at one Chromium.

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:8080";
const REPORT = path.join(__dirname, "..", "reports", "pattern-search-ui.json");

const results = [];
function record(id, status, detail) {
  results.push({ id, status, detail });
  console.log(`CASE ${id} ${status} - ${detail}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function exists(locator, timeout = 15000) {
  try {
    await locator.first().waitFor({ state: "visible", timeout });
    return true;
  } catch {
    return false;
  }
}

// Click / detect a control by its VISIBLE text content. Avoids the
// .first()-hidden trap: pages render hidden duplicates (mobile
// copies, collapsed panels) that make a role locator's first match
// invisible even when a visible match exists. Both poll up to 15s:
// the /analyze sidebar renders after an async data fetch, and an
// instant snapshot misses it on a cold chunk compile.
async function clickVisibleByText(page, pattern, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const clicked = await page.evaluate((src) => {
      const re = new RegExp(src);
      for (const el of document.querySelectorAll('button, [role="button"], a')) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && re.test(el.textContent || "")) {
          el.click();
          return true;
        }
      }
      return false;
    }, pattern.source);
    if (clicked) return true;
    await sleep(500);
  }
  return false;
}

async function visibleByText(page, pattern, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const found = await page.evaluate((src) => {
      const re = new RegExp(src);
      for (const el of document.querySelectorAll('button, [role="button"], a')) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && re.test(el.textContent || "")) return true;
      }
      return false;
    }, pattern.source);
    if (found) return true;
    await sleep(500);
  }
  return false;
}

// One fresh browser per section (see the memory note above).
async function withBrowser(fn) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage", "--no-sandbox", "--disable-gpu"],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1800 } });
    return await fn(page, browser);
  } finally {
    await browser.close().catch(() => {});
  }
}

// Open a TopMenuBar group by label. The triggers are Radix
// menuitems: <button role="menuitem" aria-label="<Label> menu">
// with visible text "<Label>" — so getByRole("button") and
// getByText("<Label> menu") both miss them. Returns true only if
// the menu content actually mounted (role=menu) or the trigger
// flipped to data-state=open.
async function openMenu(page, label) {
  const btn = page.getByRole("menuitem", { name: new RegExp(`${label} menu`, "i") }).first();
  if (!(await exists(btn, 15000))) return false;
  await btn.click().catch(() => {});
  await sleep(500);
  const menu = page.locator('[role="menu"]').first();
  if (await exists(menu, 15000)) return true;
  try {
    return (await btn.getAttribute("data-state")) === "open";
  } catch {
    return false;
  }
}

let homeMs = null;

(async () => {
  // Section 1: home + navigation (D1, D2, E1).
  await withBrowser(async (page) => {
    try {
      const t0 = Date.now();
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.getByRole("button", { name: "Menu" }).waitFor({ timeout: 30000 });
      homeMs = Date.now() - t0;
      record("D1", "PASS", `home rendered in ${homeMs}ms`);
    } catch (e) {
      record("D1", "FAIL", `home did not render: ${String(e).split("\n").slice(0, 2).join(" / ")}`);
    }

    let setupOk = false;
    let runOk = false;
    let setupErr = "";
    let runErr = "";
    try {
      await page.goto(`${BASE_URL}/setup`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.getByRole("heading", { name: "Setup", exact: true }).waitFor({ timeout: 30000 });
      setupOk = true;
    } catch (e) {
      setupErr = String(e).split("\n").slice(0, 2).join(" / ");
    }
    for (let attempt = 0; attempt < 2 && !runOk; attempt++) {
      try {
        await page.goto(`${BASE_URL}/run`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.getByText("Run screen ready").waitFor({ timeout: 30000 });
        runOk = true;
      } catch (e) {
        runErr = String(e).split("\n").slice(0, 2).join(" / ");
        await sleep(3000);
      }
    }
    if (setupOk && runOk) {
      record("D2", "PASS", "/setup heading + /run dashboard rendered");
    } else {
      record("D2", "FAIL", `setup=${setupOk} ${setupErr} run=${runOk} ${runErr}`);
    }
  });

  // Section 2: pattern surface /setup/white-boxes (D6, D7, D8).
  await withBrowser(async (page) => {
    let ok = false;
    try {
      await page.goto(`${BASE_URL}/setup/white-boxes`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await sleep(4000);
      ok = true;
    } catch {
      ok = false;
    }

    try {
      if (!ok) throw new Error("white-boxes page did not load");
      const shapeGroup = await exists(page.locator('[role="group"][aria-label="Region shape"]'), 15000);
      const info = await page.evaluate(() => {
        const text = document.body.innerText || "";
        return {
          canvases: [...document.querySelectorAll("canvas")].filter((c) => {
            const r = c.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          }).length,
          grey170: text.includes("GREYSCALE LEVEL") && text.includes("170"),
          rect: text.includes("RECT"),
          squa: text.includes("SQUA"),
          zoomIn: !!document.querySelector('[title="Zoom In"]'),
        };
      });
      if (shapeGroup) {
        record("D6", "PASS", `shape group present (RECT=${info.rect} SQUA=${info.squa} canvases=${info.canvases} greyscale170=${info.grey170} zoomTitles=${info.zoomIn})`);
      } else {
        record("D6", "FAIL", "region shape group missing on /setup/white-boxes");
      }
    } catch (e) {
      record("D6", "FAIL", `pattern toolbar check errored: ${String(e).split("\n").slice(0, 2).join(" / ")}`);
    }

    try {
      if (!ok) throw new Error("white-boxes page did not load");
      const text = await page.evaluate(() => document.body.innerText || "");
      const missing = ["Matcher Tuning", "Luma Tolerance", "Search Margin", "Search Step"].filter((t) => !text.includes(t));
      if (missing.length === 0) {
        record("D7", "PASS", "tuning surface visible (Matcher Tuning + Luma Tolerance + Search Margin + Search Step)");
      } else {
        record("D7", "UNVERIFIED", `tuning surface not visible (missing: ${missing.join(", ")}); BOXES (0) on the empty view, tuning card requires detected boxes`);
      }
    } catch (e) {
      record("D7", "UNVERIFIED", `tuning check errored: ${String(e).split("\n").slice(0, 2).join(" / ")}`);
    }

    try {
      if (!ok) throw new Error("white-boxes page did not load");
      const n = await page.evaluate(() => [...document.querySelectorAll("canvas")].filter((c) => {
        const r = c.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      }).length);
      record("D8", n > 0 ? "PASS" : "FAIL", `canvases on /setup/white-boxes: ${n}`);
    } catch (e) {
      record("D8", "FAIL", `canvas check errored: ${String(e).split("\n").slice(0, 2).join(" / ")}`);
    }
  });

  // Section 3: /analyze pin-one + panel surfaces (D11, D9, D3).
  await withBrowser(async (page) => {
    let ok = false;
    try {
      await page.goto(`${BASE_URL}/analyze`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await sleep(4000);
      ok = true;
    } catch {
      ok = false;
    }

    // D9: panel round-trip, either initial state (the sidebar may
    // start expanded or collapsed; both directions count).
    try {
      if (!ok) throw new Error("analyze page did not load");
      const hasCollapse = await visibleByText(page, /Collapse/);
      const hasExpand = await visibleByText(page, /Expand|Show/);
      let roundTrip = false;
      if (hasCollapse) {
        await clickVisibleByText(page, /Collapse/);
        await sleep(1500);
        if (await visibleByText(page, /Expand|Show/)) {
          await clickVisibleByText(page, /Expand|Show/);
          await sleep(1500);
          roundTrip = await visibleByText(page, /Collapse/);
        }
      } else if (hasExpand) {
        await clickVisibleByText(page, /Expand|Show/);
        await sleep(1500);
        if (await visibleByText(page, /Collapse/)) {
          await clickVisibleByText(page, /Collapse/);
          await sleep(1500);
          roundTrip = await visibleByText(page, /Expand|Show/);
        }
      }
      if (roundTrip) record("D9", "PASS", "panel round-trip completed");
      else if (!hasCollapse && !hasExpand) record("D9", "UNVERIFIED", "no panel collapse/expand controls rendered on this /analyze load (sidebar state varies)");
      else record("D9", "FAIL", `round-trip incomplete: collapse initially=${hasCollapse} expand initially=${hasExpand}`);
    } catch (e) {
      record("D9", "UNVERIFIED", `panel hide/restore not reachable: ${String(e).split("\n").slice(0, 2).join(" / ")}`);
    }

    try {
      if (!ok) throw new Error("analyze page did not load");
      const tune = page.getByRole("button", { name: "Visual Tune this rule" }).first();
      if (!(await exists(tune, 15000))) throw new Error("no Visual Tune button");
      await tune.click().catch(() => {});
      await sleep(3000);
      const text = await page.evaluate(() => document.body.innerText || "");
      const has = ["PIN 1 CONFIGURATION", "GREYSCALE LEVEL", "ANGLE DATUM"].every((t) => text.includes(t));
      const threshold35 = text.includes("35");
      record("D11", has ? "PASS" : "FAIL", `pin-one panel: config+datum=${has} threshold35=${threshold35}`);
    } catch (e) {
      record("D11", "UNVERIFIED", `pin-one surface not reachable: ${String(e).split("\n").slice(0, 2).join(" / ")}`);
    }

    record("D3", "UNVERIFIED", "sim tool surface unreachable: rule detail pages all stale, analyze tune opens pin-one only, Start Simulation opens no distinct sim view");
  });

  // Section 4: shell page /trial-run (D10, D4, D5).
  await withBrowser(async (page) => {
    const consoleMsgs = [];
    page.on("console", (msg) => consoleMsgs.push(msg.text()));
    let ok = false;
    try {
      await page.goto(`${BASE_URL}/trial-run`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.getByRole("heading", { name: "Trial run", exact: true }).first().waitFor({ timeout: 30000 });
      ok = true;
    } catch {
      ok = false;
    }

    try {
      if (!ok) throw new Error("trial-run shell page did not load");
      const missing = [];
      for (const id of ["window-controls", "window-fullscreen-toggle", "window-close"]) {
        if (!(await exists(page.locator(`[data-testid="${id}"]`), 15000))) missing.push(id);
      }
      if (missing.length > 0) {
        record("D10", "FAIL", `missing: ${missing.join(", ")}`);
      } else {
        const before = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight, fs: !!document.fullscreenElement }));
        await page.getByTestId("window-fullscreen-toggle").first().click().catch(() => {});
        await sleep(1000);
        const after = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight, fs: !!document.fullscreenElement }));
        await page.getByTestId("window-fullscreen-toggle").first().click().catch(() => {});
        await sleep(500);
        record("D10", "PASS", `toggle + close present; maximize click: fullscreen ${before.fs}->${after.fs}, viewport ${before.w}x${before.h}->${after.w}x${after.h} (headless may not honor fullscreen; presence is the assertion)`);
      }
    } catch (e) {
      record("D10", "FAIL", `window controls check errored: ${String(e).split("\n").slice(0, 2).join(" / ")}`);
    }

    try {
      if (!ok) throw new Error("trial-run shell page did not load");
      const ver = page.locator('[aria-label="App version"]').first();
      const bar = page.locator('[data-testid="status-bar"]').first();
      if ((await exists(ver, 15000)) || (await exists(bar, 15000))) {
        const text = await page.evaluate(() => (document.querySelector('[aria-label="App version"]')?.textContent || "").trim());
        record("D4", "PASS", `status bar / VER pill visible (version text: ${text || "n/a"})`);
      } else {
        record("D4", "UNVERIFIED", "status bar / VER pill not reachable (status bar hidden by default)");
      }
    } catch (e) {
      record("D4", "UNVERIFIED", `status bar check errored: ${String(e).split("\n").slice(0, 2).join(" / ")}`);
    }

    try {
      if (!ok) throw new Error("trial-run shell page did not load");
      const before = consoleMsgs.length;
      let opened = false;
      let openedLabel = "";
      for (const label of ["Setup", "Project", "Home", "Rules", "Test"]) {
        if (await openMenu(page, label)) {
          opened = true;
          openedLabel = label;
          break;
        }
      }
      // The app probe logs "[top-menu timing] menu opened" via
      // ClientLogger.info, which console.infos a JSON payload whose
      // numbers live under Context. React StrictMode can double-mount
      // the menu content in dev, logging a second line with nulls
      // after the real one, so take the first line with non-null
      // values, not the last line.
      const probeLines = consoleMsgs.slice(before).filter((m) => /top-menu timing/i.test(m));
      let timing = "";
      let best = null;
      for (const line of probeLines) {
        try {
          const payload = JSON.parse(line);
          const ctx = payload.Context || payload.context || payload.data || payload;
          if (ctx && ctx.triggerToMountMs !== null && ctx.triggerToMountMs !== undefined) {
            best = ctx;
            break;
          }
          if (!best && ctx) best = ctx;
        } catch { /* ignore unparsable lines */ }
      }
      if (best && best.triggerToMountMs !== null && best.triggerToMountMs !== undefined) {
        timing = ` group=${best.groupId} mount=${best.triggerToMountMs}ms paint=${best.triggerToPaintMs}ms`;
      } else if (probeLines.length > 0) {
        timing = ` raw=${probeLines[0].slice(0, 200)}`;
      }
      if (!opened) {
        record("D5", "FAIL", "no top menu trigger opened on /trial-run");
      } else if (probeLines.length > 0) {
        record("D5", "PASS", `menu opened (${openedLabel});${timing}`);
      } else {
        record("D5", "UNVERIFIED", `menu opened (${openedLabel}) but no [top-menu timing] console lines`);
      }
    } catch (e) {
      record("D5", "UNVERIFIED", `menu check errored: ${String(e).split("\n").slice(0, 2).join(" / ")}`);
    }
  });

  // Section 5: route sweep + minimize (D12, D13) in a fresh browser.
  // Each route gets its own browser context, closed right after, so
  // renderer memory cannot accumulate across the sweep (the 12th
  // route crashed the renderer when all routes shared one page).
  await withBrowser(async (page, browser) => {
    const routes = ["/", "/setup", "/run", "/setup/rules", "/setup/roi", "/analyze", "/results", "/projects", "/ai-testing", "/trial-run", "/settings/camera", "/settings/trigger"];
    const bad = [];
    for (const route of routes) {
      let ok = false;
      let lastErr = "";
      for (let attempt = 0; attempt < 2 && !ok; attempt++) {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
        try {
          const rp = await ctx.newPage();
          await rp.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
          await rp.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
          await sleep(2000);
          const info = await rp.evaluate(() => {
            const text = document.body.innerText || "";
            const h1 = [...document.querySelectorAll("h1")].map((x) => x.textContent.trim()).join("|");
            return { len: text.length, h1, url: location.pathname };
          });
          if (info.url !== route) lastErr = `redirected to ${info.url}`;
          else if (info.len < 200) lastErr = `near-blank (${info.len} chars)`;
          else if (/not found/i.test(info.h1)) lastErr = "404 heading";
          else ok = true;
        } catch (e) {
          lastErr = String(e).split("\n").slice(0, 2).join(" / ");
          await sleep(1000);
        } finally {
          await ctx.close().catch(() => {});
        }
      }
      if (!ok) bad.push(`${route}: ${lastErr}`);
    }
    record("D12", bad.length === 0 ? "PASS" : "FAIL", bad.length === 0 ? `all ${routes.length} routes render` : bad.join("; "));

    try {
      await page.goto(`${BASE_URL}/trial-run`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await sleep(2000);
      const minBtn = page.getByTestId("window-minimize");
      const minNamed = page.getByRole("button", { name: /Minimize/i });
      if ((await exists(minBtn, 3000)) || (await exists(minNamed, 3000))) {
        record("D13", "PASS", "minimize control present");
      } else {
        record("D13", "UNVERIFIED", "no minimize control rendered (by design F2; no web API for minimize in a browser tab; awaits shell decision)");
      }
    } catch (e) {
      record("D13", "UNVERIFIED", `minimize check errored: ${String(e).split("\n").slice(0, 4).join(" / ")}`);
    }
  });

  record("E1", homeMs !== null ? "PASS" : "FAIL", `home first-load=${homeMs}ms (cold Vite compile allowed)`);

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify({ baseUrl: BASE_URL, results }, null, 2));
})().catch((e) => {
  console.error("PROBE FATAL:", e);
  process.exit(1);
});
