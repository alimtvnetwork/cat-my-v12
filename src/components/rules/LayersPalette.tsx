export enum LayersPaletteCodeType {
  IUiLayerVisToggle = "I_UI_LAYER_VIS_TOGGLE",
  IUiLayerLockToggle = "I_UI_LAYER_LOCK_TOGGLE",
}
// Plan 79 step 32. V4 Layers palette (right-bottom dock).
//
// Root cause the palette fixes, in one sentence: the V4 spec requires a
// Photoshop-style Layers palette with Layers / Channels / Paths tabs
// and per-row eye + lock + inline name + chevron controls, but the
// rule editor still shows every ROI only as text inside the Conditions
// section, so users cannot toggle visibility or lock individual ROIs.
//
// Scope for this step:
//   - Composition + row chrome only. Visibility and lock state live in
//     component-local state; step 36 will persist them onto the ROI
//     schema alongside `rotation`.
//   - Inline-edit name is `contentEditable={false}` for now; wiring it
//     to the Rule facade lands with the ROI persistence slice.
//   - Channels and Paths tabs render placeholder bodies with the same
//     row density so the tab strip has stable heights.

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Eye,
  EyeOff,
  Lock,
  Trash2,
  Unlock,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Rule } from "@/lib/rules/model";
import { logger } from "@/lib/editor/errors";
import { usePaletteState, usePaletteFacade } from "@/lib/palette/usePaletteState";
import type { ChannelId } from "@/lib/palette/facade";

interface Props {
  rule: Rule;
}

interface RowState {
  visible: boolean;
  locked: boolean;
}

function readCondName(cond: unknown, idx: number): string {
  if (cond && typeof cond === "object") {
    const rec = cond as Record<string, unknown>;

    if (typeof rec.name === "string" && rec.name.trim().length > 0) {
      return rec.name;
    }

    if (typeof rec.kind === "string") return `${rec.kind} ${idx + 1}`;
  }

  return `Layer ${idx + 1}`;
}

export function LayersPalette({ rule }: Props) {
  const layers = useMemo(
    () =>
      rule.conditions.map((c, i) => ({
        id: `${rule.id}:${i}`,
        name: readCondName(c, i),
      })),
    [rule.conditions, rule.id],
  );
  const [state, setState] = useState<Record<string, RowState>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  const palette = usePaletteState(rule.id);
  const facade = usePaletteFacade();
  const channels = useMemo(
    () => palette.channels.slice().sort((a, b) => a.order - b.order),
    [palette.channels],
  );
  const paths = useMemo(
    () => palette.paths.slice().sort((a, b) => a.order - b.order),
    [palette.paths],
  );

  const toggle = (id: string, key: keyof RowState, code: LayersPaletteCodeType) => {
    setState((prev) => {
      const cur = prev[id] ?? { visible: true, locked: false };
      const next = { ...cur, [key]: !cur[key] };
      logger.info(String(code), { layer: id, next: String(next[key]) });

      return { ...prev, [id]: next };
    });
  };

  return (
    <section
      aria-label="Layers"
      data-testid="layers-palette"
      className="flex min-h-[160px] flex-col border-t border-ca-border bg-ca-panel"
    >
      <Tabs defaultValue="layers" className="flex min-h-0 flex-1 flex-col">
        <TabsList
          className="mx-hmi-2 mt-hmi-2 h-6 justify-start gap-1 bg-transparent p-0"
          data-testid="layers-tabs"
        >
          {(
            [
              ["layers", "Layers"],
              ["channels", "Channels"],
              ["paths", "Paths"],
            ] as const
          ).map(([value, label]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="h-5 rounded-sm border border-transparent bg-ca-panel-2 px-hmi-2 text-[11px] font-medium tracking-tight text-ca-ink-muted data-[state=active]:border-ca-border data-[state=active]:bg-ca-panel data-[state=active]:text-ca-ink"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent
          value="layers"
          className="mt-hmi-2 flex min-h-0 flex-1 flex-col overflow-y-auto"
          data-testid="layers-tab-body"
        >
          {layers.length === 0 ? (
            <p className="px-hmi-3 py-hmi-3 text-[11px] italic text-ca-ink-muted">
              No ROIs yet. Draw one with the Rectangle, Circle, or Polygon tool to add a layer.
            </p>
          ) : (
            <ul role="listbox" aria-label="Rule layers">
              {layers.map((layer) => {
                const rs = state[layer.id] ?? {
                  visible: true,
                  locked: false,
                };
                const isExpanded = expanded === layer.id;

                return (
                  <li
                    key={layer.id}
                    role="option"
                    aria-selected={isExpanded}
                    data-testid={`layer-row-${layer.id}`}
                    className={[
                      "flex h-6 items-center gap-hmi-2 px-hmi-2 text-[12px]",
                      isExpanded
                        ? "bg-ca-select/15 text-ca-ink"
                        : "text-ca-ink hover:bg-ca-panel-2",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      aria-pressed={rs.visible}
                      aria-label={rs.visible ? "Hide layer" : "Show layer"}
                      onClick={() =>
                        toggle(layer.id, "visible", LayersPaletteCodeType.IUiLayerVisToggle)
                      }
                      className="flex h-4 w-4 items-center justify-center rounded-sm text-ca-ink-muted transition hover:text-ca-ink"
                    >
                      {rs.visible ? (
                        <Eye size={12} strokeWidth={1.75} aria-hidden />
                      ) : (
                        <EyeOff size={12} strokeWidth={1.75} aria-hidden />
                      )}
                    </button>
                    <button
                      type="button"
                      aria-pressed={rs.locked}
                      aria-label={rs.locked ? "Unlock layer" : "Lock layer"}
                      onClick={() =>
                        toggle(layer.id, "locked", LayersPaletteCodeType.IUiLayerLockToggle)
                      }
                      className="flex h-4 w-4 items-center justify-center rounded-sm text-ca-ink-muted transition hover:text-ca-ink"
                    >
                      {rs.locked ? (
                        <Lock size={12} strokeWidth={1.75} aria-hidden />
                      ) : (
                        <Unlock size={12} strokeWidth={1.75} aria-hidden />
                      )}
                    </button>
                    <span
                      aria-hidden
                      className="h-4 w-4 shrink-0 rounded-[2px] border border-ca-border bg-ca-panel-2"
                      data-testid="layer-thumbnail"
                    />
                    <span
                      className={[
                        "flex-1 truncate",
                        rs.visible ? "" : "opacity-50 line-through",
                      ].join(" ")}
                    >
                      {layer.name}
                    </span>
                    <button
                      type="button"
                      aria-label={isExpanded ? "Collapse layer" : "Expand layer"}
                      aria-expanded={isExpanded}
                      onClick={() => setExpanded((cur) => (cur === layer.id ? null : layer.id))}
                      className="flex h-4 w-4 items-center justify-center rounded-sm text-ca-ink-muted transition hover:text-ca-ink"
                    >
                      <ChevronRight
                        size={12}
                        strokeWidth={1.75}
                        aria-hidden
                        className={["transition-transform", isExpanded ? "rotate-90" : ""].join(
                          " ",
                        )}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent
          value="channels"
          className="mt-hmi-2 flex min-h-0 flex-1 flex-col overflow-y-auto"
          data-testid="channels-tab-body"
        >
          <ul role="listbox" aria-label="Rule channels">
            {channels.map((ch, i) => (
              <li
                key={ch.id}
                role="option"
                aria-selected={false}
                data-testid={`channel-row-${ch.id}`}
                className="flex h-6 items-center gap-hmi-2 px-hmi-2 text-[12px] text-ca-ink hover:bg-ca-panel-2"
              >
                <button
                  type="button"
                  aria-pressed={ch.visible}
                  aria-label={ch.visible ? `Hide ${ch.label}` : `Show ${ch.label}`}
                  onClick={() => {
                    void facade.toggleChannel(rule.id, ch.id as ChannelId);
                    logger.info("I_UI_CHANNEL_VIS_TOGGLE", {
                      rule: rule.id,
                      channel: ch.id,
                    });
                  }}
                  className="flex h-4 w-4 items-center justify-center rounded-sm text-ca-ink-muted transition hover:text-ca-ink"
                >
                  {ch.visible ? (
                    <Eye size={12} strokeWidth={1.75} aria-hidden />
                  ) : (
                    <EyeOff size={12} strokeWidth={1.75} aria-hidden />
                  )}
                </button>
                <span
                  aria-hidden
                  className="h-3 w-3 shrink-0 rounded-[2px] border border-ca-border"
                  style={{ background: channelSwatch(ch.id as ChannelId) }}
                />
                <span className={["flex-1 truncate", ch.visible ? "" : "opacity-50"].join(" ")}>
                  {ch.label}
                </span>
                <span className="flex items-center justify-center min-w-[20px] h-4 rounded bg-ca-panel-2/50 border border-ca-border/50 font-mono text-[10px] font-medium text-ca-ink-muted tabular-nums">
                  {ch.order + 1}
                </span>
                <button
                  type="button"
                  aria-label={`Move ${ch.label} up`}
                  disabled={i === 0}
                  onClick={() => void facade.reorderChannel(rule.id, ch.id as ChannelId, -1)}
                  className="flex h-4 w-4 items-center justify-center rounded-sm text-ca-ink-muted transition hover:text-ca-ink disabled:opacity-30"
                >
                  <ChevronUp size={12} strokeWidth={1.75} aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${ch.label} down`}
                  disabled={i === channels.length - 1}
                  onClick={() => void facade.reorderChannel(rule.id, ch.id as ChannelId, 1)}
                  className="flex h-4 w-4 items-center justify-center rounded-sm text-ca-ink-muted transition hover:text-ca-ink disabled:opacity-30"
                >
                  <ChevronDown size={12} strokeWidth={1.75} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent
          value="paths"
          className="mt-hmi-2 flex min-h-0 flex-1 flex-col overflow-y-auto"
          data-testid="paths-tab-body"
        >
          <div className="flex items-center justify-between px-hmi-2 pb-hmi-1">
            <span className="text-[11px] uppercase tracking-wide text-ca-ink-muted">
              Custom paths
            </span>
            <button
              type="button"
              onClick={() => {
                const id = `path-${Date.now().toString(36)}`;
                void facade.addPath(rule.id, {
                  id,
                  name: `Path ${paths.length + 1}`,
                  d: "M 0 0",
                  visible: true,
                });
                logger.info("I_UI_PATH_ADD", { rule: rule.id, path: id });
              }}
              className="rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 py-[2px] text-[11px] text-ca-ink hover:bg-ca-panel"
            >
              + Add
            </button>
          </div>
          {paths.length === 0 ? (
            <p className="px-hmi-3 py-hmi-3 text-[11px] italic text-ca-ink-muted">
              No paths yet. Add one, or compile from Design Mode.
            </p>
          ) : (
            <ul role="listbox" aria-label="Rule paths">
              {paths.map((p, i) => (
                <li
                  key={p.id}
                  role="option"
                  aria-selected={false}
                  data-testid={`path-row-${p.id}`}
                  className="flex h-6 items-center gap-hmi-2 px-hmi-2 text-[12px] text-ca-ink hover:bg-ca-panel-2"
                >
                  <button
                    type="button"
                    aria-pressed={p.visible}
                    aria-label={p.visible ? `Hide ${p.name}` : `Show ${p.name}`}
                    onClick={() => void facade.togglePath(rule.id, p.id)}
                    className="flex h-4 w-4 items-center justify-center rounded-sm text-ca-ink-muted transition hover:text-ca-ink"
                  >
                    {p.visible ? (
                      <Eye size={12} strokeWidth={1.75} aria-hidden />
                    ) : (
                      <EyeOff size={12} strokeWidth={1.75} aria-hidden />
                    )}
                  </button>
                  <span
                    aria-hidden
                    className="h-3 w-3 shrink-0 rounded-[2px] border border-ca-border bg-ca-panel-2"
                  />
                  <span className={["flex-1 truncate", p.visible ? "" : "opacity-50"].join(" ")}>
                    {p.name}
                  </span>
                  <span className="flex items-center justify-center min-w-[20px] h-4 rounded bg-ca-panel-2/50 border border-ca-border/50 font-mono text-[10px] font-medium text-ca-ink-muted tabular-nums">
                    {p.order + 1}
                  </span>
                  <button
                    type="button"
                    aria-label={`Move ${p.name} up`}
                    disabled={i === 0}
                    onClick={() => void facade.reorderPath(rule.id, p.id, -1)}
                    className="flex h-4 w-4 items-center justify-center rounded-sm text-ca-ink-muted transition hover:text-ca-ink disabled:opacity-30"
                  >
                    <ChevronUp size={12} strokeWidth={1.75} aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${p.name} down`}
                    disabled={i === paths.length - 1}
                    onClick={() => void facade.reorderPath(rule.id, p.id, 1)}
                    className="flex h-4 w-4 items-center justify-center rounded-sm text-ca-ink-muted transition hover:text-ca-ink disabled:opacity-30"
                  >
                    <ChevronDown size={12} strokeWidth={1.75} aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${p.name}`}
                    onClick={() => void facade.removePath(rule.id, p.id)}
                    className="flex h-4 w-4 items-center justify-center rounded-sm text-ca-ink-muted transition hover:text-ca-ink"
                  >
                    <Trash2 size={12} strokeWidth={1.75} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}

function channelSwatch(id: ChannelId): string {
  switch (id) {
    case "r":
      return "#ef4444";
    case "g":
      return "#22c55e";
    case "b":
      return "#3b82f6";
    case "a":
      return "repeating-conic-gradient(#94a3b8 0 25%, #cbd5e1 0 50%) 50% / 8px 8px";
    default:
      return "linear-gradient(90deg,#ef4444,#22c55e,#3b82f6)";
  }
}
