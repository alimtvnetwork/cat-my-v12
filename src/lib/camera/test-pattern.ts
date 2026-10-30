export interface SyntheticStreamResult {
  stream: MediaStream;
  close: () => void;
}

function drawSmpteBars(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const colors = [
    "#c0c0c0",
    "#c0c000",
    "#00c0c0",
    "#00c000",
    "#c000c0",
    "#c00000",
    "#0000c0",
  ];
  const colWidth = width / colors.length;

  colors.forEach((col, idx) => {
    ctx.fillStyle = col;
    ctx.fillRect(idx * colWidth, 0, colWidth, height * 0.75);
  });
}

function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
): void {
  ctx.strokeStyle = "#00ff9d";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 20, 0, Math.PI * 2);
  ctx.moveTo(cx - 30, cy);
  ctx.lineTo(cx + 30, cy);
  ctx.moveTo(cx, cy - 30);
  ctx.lineTo(cx + 30, cy);
  ctx.stroke();
}

function drawFooterReadout(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.fillStyle = "#111827";
  ctx.fillRect(0, height * 0.75, width, height * 0.25);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 13px monospace";
  ctx.fillText(`SIMULATED FEED: ${new Date().toISOString()}`, 16, height - 16);
}

function createFallbackMediaStream(): MediaStream {
  if (typeof MediaStream !== "undefined") {
    return new MediaStream();
  }

  return {
    getTracks: () => [],
    getVideoTracks: () => [],
    getAudioTracks: () => [],
  } as unknown as MediaStream;
}

export function createSyntheticCameraStream(
  width = 960,
  height = 540,
  fps = 30,
): SyntheticStreamResult {
  if (typeof document === "undefined") {
    return {
      stream: createFallbackMediaStream(),
      close: () => {},
    };
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  let frame = 0;
  let rafId = 0;

  const render = (): void => {
    frame++;

    if (ctx) {
      drawSmpteBars(ctx, width, height);
      const cx = (Math.sin(frame * 0.03) * 0.4 + 0.5) * width;
      const cy = (Math.cos(frame * 0.03) * 0.3 + 0.5) * height;
      drawCrosshair(ctx, cx, cy);
      drawFooterReadout(ctx, width, height);
    }

    rafId = window.requestAnimationFrame(render);
  };

  render();

  const stream = typeof canvas.captureStream === "function"
    ? canvas.captureStream(fps)
    : createFallbackMediaStream();

  return {
    stream,
    close: () => {
      window.cancelAnimationFrame(rafId);
      if (typeof stream.getTracks === "function") {
        stream.getTracks().forEach((track) => track.stop());
      }
    },
  };
}
