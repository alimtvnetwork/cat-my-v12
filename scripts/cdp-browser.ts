import { spawn, type ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

interface CdpResult {
  [key: string]: unknown;
}

interface PendingCall {
  resolve: (value: CdpResult) => void;
  reject: (reason: Error) => void;
}

interface QueryHit {
  mark: string;
  text: string;
  value: string;
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

const QUERY_SCRIPT = `
(() => {
  const selector = __SELECTOR__;
  const rootMark = __ROOT_MARK__;
  const hasText = __HAS_TEXT__;
  const attrName = __ATTR_NAME__;

  function splitTop(value) {
    const parts = [];
    let current = "";
    let quote = "";
    let depth = 0;

    for (const ch of value) {
      if (quote) {
        current += ch;

        if (ch === quote) {
          quote = "";
        }

        continue;
      }

      if (ch === "'" || ch === '"') {
        quote = ch;
        current += ch;
        continue;
      }

      if (ch === "(") {
        depth += 1;
      }

      if (ch === ")") {
        depth -= 1;
      }

      if (ch === "," && depth === 0) {
        parts.push(current.trim());
        current = "";
        continue;
      }

      current += ch;
    }

    if (current.trim()) {
      parts.push(current.trim());
    }

    return parts;
  }

  function isShown(el) {
    const style = getComputedStyle(el);

    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }

    const rect = el.getBoundingClientRect();

    return rect.width > 0 && rect.height > 0;
  }

  function normalized(el) {
    return (el.innerText || el.textContent || "").replace(/\\s+/g, " ").trim();
  }

  function parseText(body) {
    if (body.startsWith("/")) {
      const last = body.lastIndexOf("/");

      return { kind: "regex", source: body.slice(1, last), flags: body.slice(last + 1) };
    }

    if ((body.startsWith("'") && body.endsWith("'")) || (body.startsWith('"') && body.endsWith('"'))) {
      return { kind: "exact", source: body.slice(1, -1), flags: "" };
    }

    return { kind: "substr", source: body, flags: "i" };
  }

  function textMatches(el, parsed) {
    const text = normalized(el);

    if (parsed.kind === "exact") {
      return text === parsed.source;
    }

    if (parsed.kind === "regex") {
      return new RegExp(parsed.source, parsed.flags).test(text);
    }

    return text.toLowerCase().includes(parsed.source.toLowerCase());
  }

  function deepest(nodes, pred) {
    const matched = nodes.filter((el) => pred(el));
    const matchedSet = new Set(matched);

    return matched.filter((el) => {
      for (const child of el.querySelectorAll("*")) {
        if (matchedSet.has(child)) {
          return false;
        }
      }

      return true;
    });
  }

  function cssWithHasText(part, scope) {
    const match = part.match(/^(.*):has-text\\((['"])(.*)\\2\\)$/);

    if (!match) {
      return Array.from(scope.querySelectorAll(part));
    }

    const css = match[1] || "*";
    const needle = match[3].toLowerCase();
    const nodes = Array.from(scope.querySelectorAll(css));

    return deepest(nodes, (el) => normalized(el).toLowerCase().includes(needle));
  }

  function queryPart(part, scope) {
    if (part.startsWith("text=")) {
      const parsed = parseText(part.slice(5));
      const nodes = Array.from(scope.querySelectorAll("*"));

      return deepest(nodes, (el) => textMatches(el, parsed));
    }

    return cssWithHasText(part, scope);
  }

  let scopes = [document];

  if (rootMark) {
    const root = document.querySelector("[data-cdp-mark='" + rootMark + "']");
    scopes = root ? [root] : [];
  }

  let found = [];

  for (const scope of scopes) {
    for (const part of splitTop(selector)) {
      found = found.concat(queryPart(part, scope));
    }
  }

  if (hasText) {
    const needle = String(hasText).toLowerCase();
    found = found.filter((el) => normalized(el).toLowerCase().includes(needle));
  }

  const token = "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const hits = found.map((el, index) => {
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
    const rect = el.getBoundingClientRect();
    const mark = token + "-" + index;
    el.setAttribute("data-cdp-mark", mark);

    return {
      mark,
      text: normalized(el),
      value: "value" in el ? String(el.value) : "",
      visible: isShown(el),
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
      width: rect.width,
      height: rect.height,
    };
  });

  return hits;
})()
`;

class CdpConnection {
  private nextId = 1;
  private pending = new Map<number, PendingCall>();
  private listeners = new Map<string, Set<(params: CdpResult) => void>>();

  constructor(private socket: WebSocket) {
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as {
        id?: number;
        method?: string;
        params?: CdpResult;
        error?: { message?: string };
        result?: CdpResult;
      };

      if (message.id && this.pending.has(message.id)) {
        const call = this.pending.get(message.id)!;
        this.pending.delete(message.id);

        if (message.error) {
          call.reject(new Error(message.error.message || "CDP error"));
        } else {
          call.resolve(message.result || {});
        }

        return;
      }

      if (message.method) {
        const handlers = this.listeners.get(message.method);

        handlers?.forEach((handler) => handler(message.params || {}));
      }
    });
  }

  on(method: string, handler: (params: CdpResult) => void): void {
    const handlers = this.listeners.get(method) || new Set();
    handlers.add(handler);
    this.listeners.set(method, handlers);
  }

  send(method: string, params: CdpResult = {}): Promise<CdpResult> {
    const id = this.nextId;
    this.nextId += 1;

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close(): void {
    this.socket.close();
  }
}

export class CdpLocator {
  constructor(
    private page: CdpPage,
    private selector: string,
    private hasText?: string,
    private index?: number,
    private parent?: CdpLocator,
  ) {}

  locator(selector: string, options?: { hasText?: string }): CdpLocator {
    return new CdpLocator(this.page, selector, options?.hasText, undefined, this);
  }

  first(): CdpLocator {
    return new CdpLocator(this.page, this.selector, this.hasText, 0, this.parent);
  }

  nth(index: number): CdpLocator {
    return new CdpLocator(this.page, this.selector, this.hasText, index, this.parent);
  }

  private async hits(): Promise<QueryHit[]> {
    const rootMark = this.parent ? (await this.parent.pick())?.mark : undefined;

    return this.page.query(this.selector, rootMark, this.hasText);
  }

  private async pick(): Promise<QueryHit | undefined> {
    const hits = await this.hits();
    const index = this.index ?? 0;

    return hits[index];
  }

  async count(): Promise<number> {
    const hits = await this.hits();

    return hits.length;
  }

  async isVisible(): Promise<boolean> {
    const hit = await this.pick();

    return hit?.visible === true;
  }

  async waitFor(options: { state?: string; timeout?: number }): Promise<void> {
    const timeout = options.timeout ?? 5000;
    const startedAt = Date.now();

    while (Date.now() - startedAt <= timeout) {
      const hit = await this.pick();
      const isReady = options.state === "visible" ? hit?.visible === true : Boolean(hit);

      if (isReady) {
        return;
      }

      await this.page.waitForTimeout(100);
    }

    throw new Error(`Timeout ${timeout}ms waiting for ${this.selector}`);
  }

  async click(_options?: { force?: boolean }): Promise<void> {
    const hit = await this.pick();

    if (!hit) {
      throw new Error(`No element for ${this.selector}`);
    }

    await this.page.clickAt(hit.x, hit.y);
  }

  async innerText(): Promise<string> {
    const hit = await this.pick();

    if (!hit) {
      throw new Error(`No element for ${this.selector}`);
    }

    return hit.text;
  }

  async inputValue(): Promise<string> {
    const hit = await this.pick();

    if (!hit) {
      throw new Error(`No element for ${this.selector}`);
    }

    return hit.value;
  }

  async getAttribute(name: string): Promise<string | null> {
    const hit = await this.pick();

    if (!hit) {
      return null;
    }

    return this.page.attributeOnMark(hit.mark, name);
  }

  async fill(value: string): Promise<void> {
    const hit = await this.pick();

    if (!hit) {
      throw new Error(`No element for ${this.selector}`);
    }

    await this.page.fillOnMark(hit.mark, value);
  }

  async evaluate(fn: (el: HTMLElement) => unknown): Promise<unknown> {
    const hit = await this.pick();

    if (!hit) {
      throw new Error(`No element for ${this.selector}`);
    }

    return this.page.evaluateOnMark(hit.mark, `(${fn.toString()})(el)`);
  }
}

interface ConsoleMessage {
  type: () => string;
  text: () => string;
}

export class CdpPage {
  private consoleHandlers: Array<(message: ConsoleMessage) => void> = [];

  constructor(private connection: CdpConnection) {
    connection.on("Runtime.consoleAPICalled", (params) => {
      const args = (params.args as Array<{ value?: unknown; description?: string }> | undefined) || [];
      const text = args.map((arg) => String(arg.value ?? arg.description ?? "")).join(" ");
      const level = String(params.type || "log");
      const message = {
        type: () => level,
        text: () => text,
      };

      this.consoleHandlers.forEach((handler) => handler(message));
    });
  }

  on(event: "console", handler: (message: ConsoleMessage) => void): void {
    if (event === "console") {
      this.consoleHandlers.push(handler);
    }
  }

  async goto(url: string, _options?: { waitUntil?: string }): Promise<void> {
    await this.connection.send("Page.navigate", { url });
    const startedAt = Date.now();

    while (Date.now() - startedAt < 20000) {
      const state = await this.connection.send("Runtime.evaluate", {
        expression: "document.readyState",
        returnByValue: true,
      });
      const value = (state.result as { value?: string } | undefined)?.value;

      if (value === "complete") {
        await this.waitForTimeout(400);

        return;
      }

      await this.waitForTimeout(100);
    }

    throw new Error(`Navigation timed out: ${url}`);
  }

  async title(): Promise<string> {
    const state = await this.connection.send("Runtime.evaluate", {
      expression: "document.title",
      returnByValue: true,
    });

    return String((state.result as { value?: string } | undefined)?.value || "");
  }

  locator(selector: string, options?: { hasText?: string }): CdpLocator {
    return new CdpLocator(this, selector, options?.hasText);
  }

  getByText(text: string | RegExp): CdpLocator {
    if (text instanceof RegExp) {
      return this.locator(`text=/${text.source}/${text.flags}`);
    }

    return this.locator(`text=${text}`);
  }

  keyboard = {
    press: async (key: string): Promise<void> => {
      const code = key === "Escape" ? 27 : key.charCodeAt(0);

      await this.connection.send("Input.dispatchKeyEvent", {
        type: "keyDown",
        key,
        code: key,
        windowsVirtualKeyCode: code,
        nativeVirtualKeyCode: code,
      });
      await this.connection.send("Input.dispatchKeyEvent", {
        type: "keyUp",
        key,
        code: key,
        windowsVirtualKeyCode: code,
        nativeVirtualKeyCode: code,
      });
    },
  };

  async waitForTimeout(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async evaluate(fn: () => unknown): Promise<unknown> {
    const state = await this.connection.send("Runtime.evaluate", {
      expression: `(${fn.toString()})()`,
      returnByValue: true,
    });

    return (state.result as { value?: unknown } | undefined)?.value;
  }

  async screenshot(options: { path: string; fullPage?: boolean }): Promise<void> {
    const shot = await this.connection.send("Page.captureScreenshot", { format: "png" });
    const data = String(shot.data || "");

    fs.writeFileSync(options.path, Buffer.from(data, "base64"));
  }

  async query(selector: string, rootMark?: string, hasText?: string): Promise<QueryHit[]> {
    const expression = QUERY_SCRIPT
      .replace("__SELECTOR__", JSON.stringify(selector))
      .replace("__ROOT_MARK__", JSON.stringify(rootMark || ""))
      .replace("__HAS_TEXT__", JSON.stringify(hasText || ""))
      .replace("__ATTR_NAME__", JSON.stringify(""));
    const state = await this.connection.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
    });
    const result = state.result as { value?: QueryHit[]; description?: string } | undefined;

    if (!result?.value) {
      const exception = (state.exceptionDetails as { text?: string } | undefined)?.text;

      throw new Error(exception || result?.description || `Query failed for ${selector}`);
    }

    return result.value;
  }

  async clickAt(x: number, y: number): Promise<void> {
    await this.connection.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x,
      y,
      button: "none",
    });
    await this.connection.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x,
      y,
      button: "left",
      clickCount: 1,
    });
    await this.connection.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x,
      y,
      button: "left",
      clickCount: 1,
    });
  }

  async evaluateOnMark(mark: string, statement: string): Promise<unknown> {
    const expression = `(() => { const el = document.querySelector("[data-cdp-mark='${mark}']"); return ${statement}; })()`;
    const state = await this.connection.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
    });

    return (state.result as { value?: unknown } | undefined)?.value;
  }

  async attributeOnMark(mark: string, name: string): Promise<string | null> {
    const value = await this.evaluateOnMark(mark, `el ? el.getAttribute(${JSON.stringify(name)}) : null`);

    return value === undefined || value === null ? null : String(value);
  }

  async fillOnMark(mark: string, value: string): Promise<void> {
    const expression = `(() => {
      const el = document.querySelector("[data-cdp-mark='${mark}']");
      const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
      proto.set.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return el.value;
    })()`;
    await this.connection.send("Runtime.evaluate", { expression, returnByValue: true });
  }

  close(): void {
    this.connection.close();
  }
}

function resolveHeadlessShell(): string {
  const candidates = [
    "C:\\Users\\Administrator\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1228\\chrome-headless-shell-win64\\chrome-headless-shell.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

async function waitForDevtools(port: number): Promise<void> {
  const deadline = Date.now() + 15000;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);

      if (res.ok) {
        return;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  throw new Error(`Headless Chrome did not open DevTools on port ${port}`);
}

async function openSocket(url: string): Promise<WebSocket> {
  const socket = new WebSocket(url.replace("localhost", "127.0.0.1"));

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`DevTools socket timed out: ${url}`)), 8000);
    socket.addEventListener("open", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error(`DevTools socket failed: ${url}`));
    });
  });

  return socket;
}

export class CdpBrowser {
  constructor(
    private child: ChildProcess,
    private port: number,
  ) {}

  async newContext(options: { viewport: { width: number; height: number } }): Promise<CdpContext> {
    return new CdpContext(this.port, options.viewport);
  }

  async close(): Promise<void> {
    this.child.kill();
  }
}

class CdpContext {
  constructor(
    private port: number,
    private viewport: { width: number; height: number },
  ) {}

  async newPage(): Promise<CdpPage> {
    const created = await fetch(`http://127.0.0.1:${this.port}/json/new?about:blank`, { method: "PUT" });
    const info = (await created.json()) as { webSocketDebuggerUrl?: string };

    if (!info.webSocketDebuggerUrl) {
      throw new Error("Headless Chrome did not return a page DevTools socket");
    }

    const socket = await openSocket(info.webSocketDebuggerUrl);
    const connection = new CdpConnection(socket);

    await connection.send("Page.enable");
    await connection.send("Runtime.enable");
    await connection.send("Emulation.setDeviceMetricsOverride", {
      width: this.viewport.width,
      height: this.viewport.height,
      deviceScaleFactor: 1,
      mobile: false,
    });

    return new CdpPage(connection);
  }
}

export async function launchCdpBrowser(): Promise<CdpBrowser> {
  const shell = resolveHeadlessShell();

  if (!fs.existsSync(shell)) {
    throw new Error(`Chromium executable not found at ${shell}`);
  }

  const port = 9344;
  const userDataDir = path.join(os.tmpdir(), `cat-cli-cdp-${Date.now()}`);
  fs.mkdirSync(userDataDir, { recursive: true });
  const child = spawn(
    shell,
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
    ],
    { stdio: "ignore" },
  );

  try {
    await waitForDevtools(port);
  } catch (err) {
    child.kill();
    throw err;
  }

  return new CdpBrowser(child, port);
}
