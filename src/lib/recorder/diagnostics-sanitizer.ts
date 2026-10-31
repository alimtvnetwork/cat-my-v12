export interface SanitizedSystemInfo {
  os: string;
  platform: string;
  architecture: string;
}

export interface SanitizedBrowserInfo {
  name: string;
  version: string;
  engine: string;
}

export interface SanitizedDisplayInfo {
  screenResolution: string;
  viewportSize: string;
  pixelRatio: number;
  colorDepth: number;
}

export interface SanitizedHardwareInfo {
  logicalCores: number;
  deviceMemoryGb: number;
  hasTouchSupport: boolean;
  gpuRenderer: string;
}

export interface SanitizedRuntimeInfo {
  environment: string;
  timezone: string;
  locale: string;
}

export interface SanitizedDiagnosticsReport {
  system: SanitizedSystemInfo;
  browser: SanitizedBrowserInfo;
  display: SanitizedDisplayInfo;
  hardware: SanitizedHardwareInfo;
  runtime: SanitizedRuntimeInfo;
}

export interface AuthenticJsStackFrame {
  functionName: string;
  fileName: string;
  lineNumber: number;
  columnNumber: number;
  rawFrame: string;
}

export function getFallbackDiagnostics(): SanitizedDiagnosticsReport {
  return {
    system: {
      os: "Generic",
      platform: "Node",
      architecture: "x64",
    },
    browser: {
      name: "Headless",
      version: "1.0",
      engine: "V8",
    },
    display: {
      screenResolution: "1920x1080",
      viewportSize: "1920x1080",
      pixelRatio: 1,
      colorDepth: 24,
    },
    hardware: {
      logicalCores: 8,
      deviceMemoryGb: 16,
      hasTouchSupport: false,
      gpuRenderer: "Software",
    },
    runtime: {
      environment: "test",
      timezone: "UTC",
      locale: "en-US",
    },
  };
}

export function sanitizeBrowserDiagnostics(): SanitizedDiagnosticsReport {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return getFallbackDiagnostics();
  }

  const ua = navigator.userAgent || "";

  let browserName = "Unknown";
  let browserVersion = "0.0";
  let engine = "Blink";

  if (ua.includes("Firefox/")) {
    browserName = "Firefox";
    browserVersion = ua.split("Firefox/")[1]?.split(" ")[0] ?? "";
    engine = "Gecko";
  } else if (ua.includes("Edg/")) {
    browserName = "Edge";
    browserVersion = ua.split("Edg/")[1]?.split(" ")[0] ?? "";
    engine = "Blink";
  } else if (ua.includes("OPR/")) {
    browserName = "Opera";
    browserVersion = ua.split("OPR/")[1]?.split(" ")[0] ?? "";
    engine = "Blink";
  } else if (ua.includes("Chrome/")) {
    browserName = "Chrome";
    browserVersion = ua.split("Chrome/")[1]?.split(" ")[0] ?? "";
    engine = "Blink";
  } else if (ua.includes("Safari/") && !ua.includes("Chrome")) {
    browserName = "Safari";
    browserVersion = ua.split("Version/")[1]?.split(" ")[0] ?? "";
    engine = "WebKit";
  }

  let os = "Unknown";

  if (ua.includes("Windows NT 10.0") || ua.includes("Windows NT 11.0")) {
    os = "Windows 10/11";
  } else if (ua.includes("Windows")) {
    os = "Windows";
  } else if (ua.includes("Mac OS X") || ua.includes("Macintosh")) {
    os = "macOS";
  } else if (ua.includes("Android")) {
    os = "Android";
  } else if (ua.includes("iPhone") || ua.includes("iPad")) {
    os = "iOS";
  } else if (ua.includes("Linux")) {
    os = "Linux";
  }

  let gpuRenderer = "Integrated / Software";

  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

    if (gl) {
      const debugInfo = (gl as WebGLRenderingContext).getExtension("WEBGL_debug_renderer_info");

      if (debugInfo) {
        const unmasked = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

        if (unmasked && typeof unmasked === "string") {
          gpuRenderer = unmasked;
        }
      }
    }
  } catch {
    // Non-critical WebGL probe fallback
  }

  const isTouchSupported = Boolean(
    (typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 0) ||
      ("ontouchstart" in window),
  );

  const deviceMem = "deviceMemory" in navigator ? Number((navigator as unknown as { deviceMemory?: number }).deviceMemory) : 8;

  return {
    system: {
      os,
      platform: navigator.platform || "Win32",
      architecture: ua.includes("x64") || ua.includes("Win64") || ua.includes("x86_64") ? "x64" : "arm64",
    },
    browser: {
      name: browserName,
      version: browserVersion,
      engine,
    },
    display: {
      screenResolution: `${window.screen?.width ?? 0}x${window.screen?.height ?? 0}`,
      viewportSize: `${window.innerWidth ?? 0}x${window.innerHeight ?? 0}`,
      pixelRatio: Number((window.devicePixelRatio || 1).toFixed(2)),
      colorDepth: window.screen?.colorDepth ?? 24,
    },
    hardware: {
      logicalCores: navigator.hardwareConcurrency ?? 8,
      deviceMemoryGb: deviceMem || 8,
      hasTouchSupport: isTouchSupported,
      gpuRenderer: gpuRenderer.replace(/\s+/g, " ").trim(),
    },
    runtime: {
      environment: typeof process !== "undefined" && process.env?.NODE_ENV ? process.env.NODE_ENV : "production",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      locale: navigator.language || "en-US",
    },
  };
}

function cleanAssetUrl(url: string): string {
  try {
    const parsed = new URL(url);

    return parsed.pathname.replace(/^\/@fs\//, "").replace(/^\//, "");
  } catch {
    return url.split("?")[0].replace(/^webpack:\/\/\/?/, "");
  }
}

function isInternalFrame(fnName: string, path: string): boolean {
  if (path.includes("node_modules")) {
    return true;
  }

  if (path.includes("vite/dist") || path.includes("@vite/client")) {
    return true;
  }

  if (
    fnName.startsWith("react_") ||
    fnName.startsWith("renderWithHooks") ||
    fnName.startsWith("performUnitOfWork") ||
    fnName.startsWith("beginWork") ||
    fnName.startsWith("completeUnitOfWork") ||
    fnName.startsWith("workLoop")
  ) {
    return true;
  }

  return false;
}

export function captureAuthenticJsStack(
  errorOrUnknown?: unknown,
  skipFrames = 1,
): AuthenticJsStackFrame[] {
  const err =
    errorOrUnknown instanceof Error
      ? errorOrUnknown
      : new Error(typeof errorOrUnknown === "string" ? errorOrUnknown : "Diagnostic Trace");

  const rawStack = err.stack ?? "";
  const lines = rawStack.split("\n");
  const frames: AuthenticJsStackFrame[] = [];

  for (let i = skipFrames; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line.startsWith("at ") && !line.includes("@")) {
      continue;
    }

    // Pattern 1: at FunctionName (http://localhost:5173/src/routes/run.tsx?t=123:45:67)
    // or: at async FunctionName (http://localhost:5173/src/routes/run.tsx?t=123:45:67)
    const matchWithFn = line.match(/^at\s+(?:async\s+)?([^\s(]+)\s*\((.+):(\d+):(\d+)\)$/);

    if (matchWithFn) {
      const [, fnName, rawUrl, lineStr, colStr] = matchWithFn;
      const cleanPath = cleanAssetUrl(rawUrl);

      if (isInternalFrame(fnName, cleanPath)) {
        continue;
      }

      frames.push({
        functionName: fnName,
        fileName: cleanPath,
        lineNumber: parseInt(lineStr, 10),
        columnNumber: parseInt(colStr, 10),
        rawFrame: line,
      });

      continue;
    }

    // Pattern 2: at http://localhost:5173/src/routes/run.tsx:45:67
    const matchNoFn = line.match(/^at\s+(.+):(\d+):(\d+)$/);

    if (matchNoFn) {
      const [, rawUrl, lineStr, colStr] = matchNoFn;
      const cleanPath = cleanAssetUrl(rawUrl);

      if (isInternalFrame("anonymous", cleanPath)) {
        continue;
      }

      frames.push({
        functionName: "anonymous",
        fileName: cleanPath,
        lineNumber: parseInt(lineStr, 10),
        columnNumber: parseInt(colStr, 10),
        rawFrame: line,
      });

      continue;
    }

    // Pattern 3: Firefox / Safari format: fnName@http://localhost:5173/src/routes/run.tsx:45:67
    const matchFirefox = line.match(/^([^@]*)@(.+):(\d+):(\d+)$/);

    if (matchFirefox) {
      const [, fnName, rawUrl, lineStr, colStr] = matchFirefox;
      const resolvedFn = fnName.trim() || "anonymous";
      const cleanPath = cleanAssetUrl(rawUrl);

      if (isInternalFrame(resolvedFn, cleanPath)) {
        continue;
      }

      frames.push({
        functionName: resolvedFn,
        fileName: cleanPath,
        lineNumber: parseInt(lineStr, 10),
        columnNumber: parseInt(colStr, 10),
        rawFrame: line,
      });
    }
  }

  return frames;
}
