export interface CaptureScreenshotOptions {
  title?: string;
  source?: "manual" | "step" | "canvas";
  targetElement?: HTMLElement | null;
}

export interface ScreenshotResult {
  hasImage: boolean;
  dataUrl: string;
  title: string;
  width: number;
  height: number;
}

const FALLBACK_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function getVisibleCanvas(): HTMLCanvasElement | null {
  if (typeof document === "undefined") {
    return null;
  }

  const canvases = Array.from(document.querySelectorAll("canvas"));
  const visible = canvases.find((c) => {
    const rect = c.getBoundingClientRect();

    return rect.width > 20 && rect.height > 20;
  });

  return visible ?? null;
}

function renderSyntheticSnapshot(
  targetElement: HTMLElement | null,
  title: string,
): ScreenshotResult {
  if (typeof document === "undefined") {
    return { hasImage: true, dataUrl: FALLBACK_PNG, title, width: 1, height: 1 };
  }

  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 500;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return { hasImage: true, dataUrl: FALLBACK_PNG, title, width: 800, height: 500 };
  }

  drawSnapshotBackground(ctx, canvas.width, canvas.height);
  drawSnapshotHeader(ctx, title);
  drawSnapshotElementInfo(ctx, targetElement);

  return {
    hasImage: true,
    dataUrl: canvas.toDataURL("image/png"),
    title,
    width: canvas.width,
    height: canvas.height,
  };
}

function drawSnapshotBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.fillStyle = "#0c1017";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(34, 211, 238, 0.15)";
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, width - 20, height - 20);
}

function drawSnapshotHeader(ctx: CanvasRenderingContext2D, title: string): void {
  ctx.fillStyle = "#22d3ee";
  ctx.font = "bold 16px monospace";
  ctx.fillText("CAT-iVISION SCREENSHOT CAPTURE", 24, 38);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "13px sans-serif";
  ctx.fillText(`Action: ${title}`, 24, 64);

  const route = typeof window !== "undefined" ? window.location.pathname : "/";
  ctx.fillText(`Route: ${route} | Time: ${new Date().toLocaleTimeString()}`, 24, 86);
}

function drawSnapshotElementInfo(
  ctx: CanvasRenderingContext2D,
  targetElement: HTMLElement | null,
): void {
  ctx.fillStyle = "rgba(30, 41, 59, 0.7)";
  ctx.fillRect(24, 110, 752, 340);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.strokeRect(24, 110, 752, 340);

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "14px monospace";

  if (!targetElement) {
    ctx.fillText("Full Screen View / Canvas State", 40, 150);

    return;
  }

  const tag = targetElement.tagName.toLowerCase();
  const text = targetElement.innerText?.slice(0, 50) ?? "";
  const tour = targetElement.getAttribute("data-tour") ?? "none";

  ctx.fillText(`Element: <${tag}>`, 40, 150);
  ctx.fillText(`Text: "${text}"`, 40, 180);
  ctx.fillText(`data-tour: ${tour}`, 40, 210);
  ctx.fillText(`CSS Class: ${targetElement.className.slice(0, 60)}`, 40, 240);
}

export function captureScreenSnapshot(options: CaptureScreenshotOptions = {}): ScreenshotResult {
  const title = options.title ?? "Screen Snapshot";
  const canvas = getVisibleCanvas();

  if (canvas) {
    try {
      const dataUrl = canvas.toDataURL("image/png");

      return {
        hasImage: true,
        dataUrl,
        title,
        width: canvas.width,
        height: canvas.height,
      };
    } catch {
      // Security or tainted canvas fallback
      return renderSyntheticSnapshot(options.targetElement ?? null, title);
    }
  }

  return renderSyntheticSnapshot(options.targetElement ?? null, title);
}
