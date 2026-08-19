import { RuleKindType } from "@/types/rules/RuleKind";
import type { EditorRule } from "@/lib/editor/types";
import { svgMaskDataUrl } from "./SelectionOverlayUtils";
import { OUTER_BLUR_PX, INNER_BAND_BLUR_PX } from "./SelectionOverlayConstants";

interface Props {
  rule: EditorRule;
  tl: { x: number; y: number };
  br: { x: number; y: number };
  theta: number;
  rotateTransform?: string;
  canvasSize: { width: number; height: number };
}

export function SelectionOverlayBlurBackdrop({
  rule,
  tl,
  br,
  theta,
  rotateTransform,
  canvasSize,
}: Props): React.JSX.Element | null {
  const w = Math.max(0, br.x - tl.x);
  const h = Math.max(0, br.y - tl.y);
  const cw = canvasSize.width;
  const ch = canvasSize.height;
  const cx = tl.x + w / 2;
  const cy = tl.y + h / 2;
  const rot = theta ? `rotate(${theta} ${cx} ${cy})` : "";
  // Outer mask: white full canvas with a black bbox (rotated)
  // punched out. Blur shows everywhere the mask is white.
  const outerMask =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${cw}' height='${ch}' viewBox='0 0 ${cw} ${ch}'>` +
    `<rect width='100%' height='100%' fill='white'/>` +
    `<rect x='${tl.x}' y='${tl.y}' width='${w}' height='${h}' fill='black' transform='${rot}'/>` +
    `</svg>`;
  // Inner mask (only meaningful for circle kind): white bbox
  // with the inscribed ellipse (the shape) punched out.
  const innerMask =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>` +
    `<rect width='100%' height='100%' fill='white'/>` +
    (RuleKindType.isCircle(rule.kind)
      ? `<ellipse cx='${w / 2}' cy='${h / 2}' rx='${w / 2}' ry='${h / 2}' fill='black'/>`
      : `<rect width='100%' height='100%' fill='black'/>`) +
    `</svg>`;
  const outerMaskUrl = svgMaskDataUrl(outerMask);
  const innerMaskUrl = svgMaskDataUrl(innerMask);

  return (
    <>
      {/* Layer 1: heavy blur everywhere outside the bbox. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backdropFilter: `blur(${OUTER_BLUR_PX}px)`,
          maskImage: outerMaskUrl,
          WebkitMaskImage: outerMaskUrl,
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
        }}
      />
      {/* Layer 2: light blur in the bbox band around the shape.
      For non-circle kinds shape == bbox, so this layer is
      fully masked out and contributes nothing. */}
      {RuleKindType.isCircle(rule.kind) ? (
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left: tl.x,
            top: tl.y,
            width: w,
            height: h,
            transform: rotateTransform,
            transformOrigin: "center center",
            backdropFilter: `blur(${INNER_BAND_BLUR_PX}px)`,
            maskImage: innerMaskUrl,
            WebkitMaskImage: innerMaskUrl,
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
          }}
        />
      ) : null}
      {/* Parameter visualization: colored guides that render
      outside the shape so the operator can see how radius
      and threshold reshape the acceptance region without
      tinting the shape interior. */}
      {(() => {
        const p = (rule.params ?? {}) as Record<string, unknown>;
        const radiusParam = typeof p.radius === "number" ? p.radius : 0;
        const thresholdParam = typeof p.threshold === "number" ? p.threshold : 0;
        const similarityParam = typeof p.similarity === "number" ? p.similarity : 0;

        if (!radiusParam && !thresholdParam && !similarityParam) return null;
        const halfW = w / 2;
        const halfH = h / 2;
        const rx = halfW + radiusParam;
        const ry = halfH + radiusParam;
        const thBand = Math.max(4, (thresholdParam / 100) * 24);
        const simBand = Math.max(4, (similarityParam / 100) * 18);
        const pad = Math.max(radiusParam + thBand + simBand + 4, 24);
        const vbW = w + pad * 2;
        const vbH = h + pad * 2;

        return (
          <svg
            aria-hidden
            className="pointer-events-none absolute"
            width={vbW}
            height={vbH}
            style={{
              left: tl.x - pad,
              top: tl.y - pad,
              transform: rotateTransform,
              transformOrigin: "center center",
              overflow: "visible",
            }}
          >
            {thresholdParam > 0 ? (
              RuleKindType.isCircle(rule.kind) ? (
                <ellipse
                  cx={pad + halfW}
                  cy={pad + halfH}
                  rx={halfW + thBand}
                  ry={halfH + thBand}
                  fill="none"
                  stroke="rgb(56 189 248)"
                  strokeOpacity={0.35 + (thresholdParam / 100) * 0.35}
                  strokeWidth={thBand}
                />
              ) : (
                <rect
                  x={pad - thBand / 2}
                  y={pad - thBand / 2}
                  width={w + thBand}
                  height={h + thBand}
                  fill="none"
                  stroke="rgb(56 189 248)"
                  strokeOpacity={0.35 + (thresholdParam / 100) * 0.35}
                  strokeWidth={thBand}
                  rx={2}
                />
              )
            ) : null}
            {similarityParam > 0 ? (
              RuleKindType.isCircle(rule.kind) ? (
                <ellipse
                  cx={pad + halfW}
                  cy={pad + halfH}
                  rx={halfW + thBand + simBand}
                  ry={halfH + thBand + simBand}
                  fill="none"
                  stroke="rgb(232 121 249)"
                  strokeOpacity={0.5}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
              ) : null
            ) : null}
            {radiusParam > 0 ? (
              RuleKindType.isCircle(rule.kind) ? (
                <ellipse
                  cx={pad + halfW}
                  cy={pad + halfH}
                  rx={rx}
                  ry={ry}
                  fill="none"
                  stroke="rgb(251 146 60)"
                  strokeOpacity={0.85}
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                />
              ) : (
                <rect
                  x={pad - radiusParam}
                  y={pad - radiusParam}
                  width={w + radiusParam * 2}
                  height={h + radiusParam * 2}
                  fill="none"
                  stroke="rgb(251 146 60)"
                  strokeOpacity={0.85}
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  rx={4}
                />
              )
            ) : null}
          </svg>
        );
      })()}
    </>
  );
}
