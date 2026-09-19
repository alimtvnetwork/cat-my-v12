import { useEffect, useRef, useState, type PointerEvent } from "react";
import { RefreshCw, Upload } from "lucide-react";
import { fetchBackend } from "@/lib/backend/http";
import { HttpMethod } from "@/lib/constants";
import {
  base64ToRgba,
  drawRgbaToCanvas,
  readImageFile,
  renderSelectedWhiteBoxMarks,
  rgbaToBase64,
  toThresholdPreviewRgba,
  type SearchRegion,
  type WhiteBoxMark,
  type WhiteBoxMarkingInput,
  type WhiteBoxMarkingResult,
} from "@/lib/vision/white-box-marking";

interface BackendResult {
  Width: number;
  Height: number;
  RgbaBase64: string;
  Boxes: WhiteBoxMark[];
}

type CanvasPoint = { x: number; y: number };
type RegionHandle = "move" | "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";
type RegionDrag = { handle: RegionHandle | "new"; start: CanvasPoint; region: SearchRegion | null };

export function WhiteBoxMarkingTool() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestIdRef = useRef(0);
  const [source, setSource] = useState<WhiteBoxMarkingInput | null>(null);
  const [result, setResult] = useState<WhiteBoxMarkingResult | null>(null);
  const [detectedBoxes, setDetectedBoxes] = useState<WhiteBoxMark[]>([]);
  const [selectedBoxNumbers, setSelectedBoxNumbers] = useState<Set<number>>(new Set());
  const [appliedHiddenBoxNumbers, setAppliedHiddenBoxNumbers] = useState<Set<number>>(new Set());
  const [searchRegion, setSearchRegion] = useState<SearchRegion | null>(null);
  const [greyscaleLevel, setGreyscaleLevel] = useState(170);
  const [dragState, setDragState] = useState<RegionDrag | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState("Load image to start.");

  useEffect(() => {
    paintCanvas();
  }, [result, source, searchRegion, greyscaleLevel]);

  async function loadFile(file: File | undefined): Promise<void> {
    if (file === undefined) return;
    const input = await readImageFile(file);
    setSource(input);
    setResult(null);
    setDetectedBoxes([]);
    setSelectedBoxNumbers(new Set());
    setAppliedHiddenBoxNumbers(new Set());
    setSearchRegion(null);
    setDragState(null);
    setMessage(`Loaded ${file.name}. Draw the required region.`);
  }

  async function processRegion(input: WhiteBoxMarkingInput, region: SearchRegion): Promise<void> {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsProcessing(true);
    setMessage("Processing...");
    try {
      const next = await runBackend(input, region, greyscaleLevel);
      if (requestIdRef.current !== requestId) return;
      setResult(renderSelectedWhiteBoxMarks(input, next.boxes, greyscaleLevel));
      setDetectedBoxes(next.boxes);
      setSelectedBoxNumbers(new Set());
      setAppliedHiddenBoxNumbers(new Set());
      setMessage(`Marked ${next.boxes.length} item(s).`);
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      setMessage(error instanceof Error ? error.message : "Processing failed.");
    } finally {
      if (requestIdRef.current === requestId) setIsProcessing(false);
    }
  }

  function paintCanvas(): void {
    const canvas = canvasRef.current;
    const image =
      result ??
      (source === null
        ? null
        : {
            width: source.width,
            height: source.height,
            rgba: toThresholdPreviewRgba(source, greyscaleLevel),
          });
    if (canvas === null || image === null) return;
    drawRgbaToCanvas(canvas, image.width, image.height, image.rgba);
    if (searchRegion === null) return;
    const context = canvas.getContext("2d");
    if (context === null) return;
    context.save();
    context.strokeStyle = "#22d3ee";
    context.lineWidth = Math.max(2, Math.round(Math.min(canvas.width, canvas.height) / 240));
    context.setLineDash([8, 5]);
    context.strokeRect(searchRegion.x + 0.5, searchRegion.y + 0.5, searchRegion.width, searchRegion.height);
    context.setLineDash([]);
    drawRegionHandles(context, searchRegion);
    context.restore();
  }

  function beginRegion(event: PointerEvent<HTMLCanvasElement>): void {
    if (source === null) return;
    const point = canvasPoint(event);
    const handle = searchRegion === null ? "new" : hitRegionHandle(searchRegion, point);
    setDragState({ handle, start: point, region: searchRegion });
    if (handle === "new") setSearchRegion({ x: point.x, y: point.y, width: 1, height: 1 });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function updateRegion(event: PointerEvent<HTMLCanvasElement>): void {
    if (source === null || dragState === null) return;
    setSearchRegion(regionForDrag(source.width, source.height, dragState, canvasPoint(event)));
  }

  function finishRegion(event: PointerEvent<HTMLCanvasElement>): void {
    if (source === null || dragState === null) return;
    const region = regionForDrag(source.width, source.height, dragState, canvasPoint(event));
    setDragState(null);
    setSearchRegion(region.width > 1 && region.height > 1 ? region : null);
    setResult(null);
    setDetectedBoxes([]);
    setSelectedBoxNumbers(new Set());
    setAppliedHiddenBoxNumbers(new Set());
    setMessage(region.width > 1 && region.height > 1 ? "Region ready. Press Process." : "Draw a bigger region.");
  }

  function changeGreyscaleLevel(value: number): void {
    setGreyscaleLevel(value);
    setResult(null);
    setDetectedBoxes([]);
    setSelectedBoxNumbers(new Set());
    setAppliedHiddenBoxNumbers(new Set());
    setMessage(searchRegion === null ? "Draw the required region." : "Greyscale level changed. Press Process.");
  }

  function toggleBox(number: number): void {
    setSelectedBoxNumbers((current) => {
      const next = new Set(current);
      if (next.has(number)) next.delete(number);
      else next.add(number);
      return next;
    });
  }

  function updateVisibleBoxes(): void {
    if (source === null) return;
    const hidden = new Set(selectedBoxNumbers);
    const visibleBoxes = detectedBoxes.filter((box) => !hidden.has(box.number));
    setAppliedHiddenBoxNumbers(hidden);
    setResult(renderSelectedWhiteBoxMarks(source, visibleBoxes, greyscaleLevel));
    setMessage(`Showing ${visibleBoxes.length} of ${detectedBoxes.length} item(s).`);
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-x-auto bg-std-chrome text-ca-ink font-sans select-none">
      <div className="flex h-full min-h-[720px] min-w-[1024px] flex-col">
      <header className="flex h-10 shrink-0 flex-wrap items-center gap-3 border-b border-ca-border bg-ca-panel-2 px-3 py-1.5">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-ca-border bg-ca-panel px-2.5 py-1 text-xs font-semibold text-ca-ink hover:bg-ca-bg">
          <Upload className="h-3.5 w-3.5" />
          <span>Load Image</span>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => loadFile(event.target.files?.[0])}
            className="sr-only"
          />
        </label>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded border border-ca-border bg-ca-panel px-2.5 py-1 text-xs font-semibold text-ca-ink hover:bg-ca-bg disabled:opacity-50"
          onClick={() => {
            if (source !== null && searchRegion !== null) void processRegion(source, searchRegion);
          }}
          disabled={source === null || searchRegion === null || isProcessing}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isProcessing ? "animate-spin" : ""}`} />
          <span>{isProcessing ? "Processing" : "Process"}</span>
        </button>
        <span className="ml-auto font-mono text-[11px] text-ca-ink-muted">{message}</span>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px]">
        <div className="h-full overflow-auto border-r border-ca-border bg-ca-bg p-3">
          <canvas
            ref={canvasRef}
            className="block max-w-none touch-none cursor-crosshair border border-ca-border bg-black/20 shadow-sm"
            onPointerDown={beginRegion}
            onPointerMove={updateRegion}
            onPointerUp={finishRegion}
            onPointerCancel={() => setDragState(null)}
          />
        </div>
        <aside className="flex h-full min-h-0 flex-col border-l border-ca-border bg-ca-panel text-ca-ink">
          <div className="flex shrink-0 items-center justify-between border-b border-ca-border bg-ca-panel-2 px-3 py-1.5">
            <div className="flex items-center gap-2">
              <span className="rounded bg-ca-ink px-1.5 py-0.5 font-mono text-xs font-bold text-ca-bg shadow-sm">
                T116
              </span>
              <span className="text-xs font-bold uppercase tracking-wide">Greyscale Pattern Matching</span>
            </div>
            <span className="font-mono text-[11px] text-ca-ink-muted">Results</span>
          </div>
          <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-ca-border bg-ca-bg/70 px-2 py-1">
            <button className="whitespace-nowrap rounded border border-ca-border bg-ca-panel px-2.5 py-1 text-xs font-semibold text-ca-ink shadow-sm">
              Box Review
            </button>
            <button className="whitespace-nowrap rounded px-2.5 py-1 text-xs font-medium text-ca-ink-muted">
              Search Region
            </button>
            <button className="whitespace-nowrap rounded px-2.5 py-1 text-xs font-medium text-ca-ink-muted">
              Display
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 text-xs">
            <div className="mb-3 rounded border border-ca-border bg-ca-panel-2 p-3">
              <div className="mb-2 border-b border-ca-border pb-1 font-semibold uppercase tracking-wide">
                Search Region
              </div>
              <div className="font-mono text-ca-ink-muted">
                {searchRegion === null
                  ? "None"
                  : `X ${searchRegion.x}  Y ${searchRegion.y}  W ${searchRegion.width}  H ${searchRegion.height}`}
              </div>
            </div>
            <div className="mb-3 rounded border border-ca-border bg-ca-panel-2 p-3">
              <div className="mb-2 flex items-center justify-between border-b border-ca-border pb-1">
                <span className="font-semibold uppercase tracking-wide">Greyscale Level</span>
                <span className="font-mono text-ca-ink-muted">{greyscaleLevel}</span>
              </div>
              <input
                type="range"
                min={0}
                max={255}
                value={greyscaleLevel}
                onChange={(event) => changeGreyscaleLevel(Number(event.target.value))}
                className="w-full accent-ca-select"
              />
            </div>
            <div className="rounded border border-ca-border bg-ca-panel-2 p-3">
              <div className="mb-3 flex items-center justify-between gap-2 border-b border-ca-border pb-2">
                <span className="font-semibold uppercase tracking-wide">
                  Boxes ({detectedBoxes.length})
                </span>
                <button
                  type="button"
                  className="rounded bg-ca-ink px-3 py-1.5 text-xs font-bold text-ca-bg hover:opacity-90 disabled:opacity-50"
                  onClick={updateVisibleBoxes}
                  disabled={source === null || detectedBoxes.length === 0}
                >
                  Update
                </button>
              </div>
              <div className="space-y-1.5">
                {detectedBoxes.map((box) => (
                  <label
                    key={box.number}
                    className={`flex cursor-pointer items-start gap-2 rounded border p-2 ${
                      appliedHiddenBoxNumbers.has(box.number)
                        ? "border-red-500/60 bg-red-500/10"
                        : "border-ca-border bg-ca-panel"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedBoxNumbers.has(box.number)}
                      onChange={() => toggleBox(box.number)}
                      className="mt-0.5 accent-ca-select"
                    />
                    <span className="font-mono">
                      #{box.number} X{box.x} Y{box.y} W{box.width} H{box.height}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
      </div>
    </section>
  );
}

async function runBackend(
  input: WhiteBoxMarkingInput,
  searchRegion: SearchRegion,
  greyscaleLevel: number,
): Promise<WhiteBoxMarkingResult> {
  const envelope = await fetchBackend<BackendResult>("vision/white-box-marking", {
    method: HttpMethod.Post,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      Width: input.width,
      Height: input.height,
      RgbaBase64: rgbaToBase64(input.rgba),
      WhiteThreshold: greyscaleLevel,
      SearchRegion: {
        X: searchRegion.x,
        Y: searchRegion.y,
        Width: searchRegion.width,
        Height: searchRegion.height,
      },
    }),
  });
  const body = envelope.Results[0];
  return { width: body.Width, height: body.Height, rgba: base64ToRgba(body.RgbaBase64), boxes: body.Boxes };
}

function canvasPoint(event: PointerEvent<HTMLCanvasElement>): CanvasPoint {
  const rect = event.currentTarget.getBoundingClientRect();
  const scaleX = event.currentTarget.width / rect.width;
  const scaleY = event.currentTarget.height / rect.height;
  return {
    x: Math.floor((event.clientX - rect.left) * scaleX),
    y: Math.floor((event.clientY - rect.top) * scaleY),
  };
}

function regionFromPoints(width: number, height: number, start: CanvasPoint, end: CanvasPoint): SearchRegion {
  const maxX = Math.max(0, width - 1);
  const maxY = Math.max(0, height - 1);
  const x0 = Math.max(0, Math.min(maxX, Math.min(start.x, end.x)));
  const y0 = Math.max(0, Math.min(maxY, Math.min(start.y, end.y)));
  const x1 = Math.max(0, Math.min(maxX, Math.max(start.x, end.x)));
  const y1 = Math.max(0, Math.min(maxY, Math.max(start.y, end.y)));
  return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

function regionForDrag(width: number, height: number, drag: RegionDrag, current: CanvasPoint): SearchRegion {
  if (drag.handle === "new" || drag.region === null) return regionFromPoints(width, height, drag.start, current);
  const dx = current.x - drag.start.x;
  const dy = current.y - drag.start.y;
  if (drag.handle === "move") return clampRegion(width, height, { ...drag.region, x: drag.region.x + dx, y: drag.region.y + dy });
  return resizeRegion(width, height, drag.region, drag.handle, dx, dy);
}

function resizeRegion(width: number, height: number, region: SearchRegion, handle: RegionHandle, dx: number, dy: number): SearchRegion {
  let x0 = region.x;
  let y0 = region.y;
  let x1 = region.x + region.width - 1;
  let y1 = region.y + region.height - 1;
  if (handle.includes("w")) x0 += dx;
  if (handle.includes("e")) x1 += dx;
  if (handle.includes("n")) y0 += dy;
  if (handle.includes("s")) y1 += dy;
  return regionFromPoints(width, height, { x: x0, y: y0 }, { x: x1, y: y1 });
}

function clampRegion(width: number, height: number, region: SearchRegion): SearchRegion {
  return regionFromPoints(
    width,
    height,
    { x: region.x, y: region.y },
    { x: region.x + region.width - 1, y: region.y + region.height - 1 },
  );
}

function hitRegionHandle(region: SearchRegion, point: CanvasPoint): RegionHandle | "new" {
  const handles = regionHandles(region);
  for (const handle of handles) {
    if (Math.abs(point.x - handle.x) <= 6 && Math.abs(point.y - handle.y) <= 6) return handle.id;
  }
  if (
    point.x >= region.x &&
    point.y >= region.y &&
    point.x <= region.x + region.width - 1 &&
    point.y <= region.y + region.height - 1
  ) {
    return "move";
  }
  return "new";
}

function drawRegionHandles(context: CanvasRenderingContext2D, region: SearchRegion): void {
  context.fillStyle = "#22d3ee";
  context.strokeStyle = "#001015";
  for (const handle of regionHandles(region)) {
    context.fillRect(handle.x - 4, handle.y - 4, 8, 8);
    context.strokeRect(handle.x - 4.5, handle.y - 4.5, 9, 9);
  }
}

function regionHandles(region: SearchRegion): Array<{ id: RegionHandle; x: number; y: number }> {
  const x0 = region.x;
  const y0 = region.y;
  const x1 = region.x + region.width - 1;
  const y1 = region.y + region.height - 1;
  const xm = Math.round((x0 + x1) / 2);
  const ym = Math.round((y0 + y1) / 2);
  return [
    { id: "nw", x: x0, y: y0 },
    { id: "n", x: xm, y: y0 },
    { id: "ne", x: x1, y: y0 },
    { id: "e", x: x1, y: ym },
    { id: "se", x: x1, y: y1 },
    { id: "s", x: xm, y: y1 },
    { id: "sw", x: x0, y: y1 },
    { id: "w", x: x0, y: ym },
  ];
}
