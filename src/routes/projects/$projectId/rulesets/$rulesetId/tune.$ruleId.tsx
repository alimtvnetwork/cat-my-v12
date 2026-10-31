import { useMemo, type JSX } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useProjectStore, selectRulesetsForProject, selectProject } from "@/lib/projects/store";
import { resolveIdParam, toIntParam, IntAliasNamespaceType } from "@/lib/ids/int-alias";
import type { EditorRule } from "@/lib/editor/types";
import { RuleToolConfigPanel } from "@/components/vision/workpiece/RuleToolConfigPanel";

export const Route = createFileRoute("/projects/$projectId/rulesets/$rulesetId/tune/$ruleId")({
  component: TuneRulePage,
});

function TuneRulePage() {
  const { projectId, rulesetId, ruleId } = Route.useParams();
  const navigate = useNavigate();

  const project = useProjectStore((s) => selectProject(s, projectId));
  const rulesets = useProjectStore((s) => selectRulesetsForProject(s, projectId));
  const resolvedRulesetId = useMemo(
    () => resolveIdParam(IntAliasNamespaceType.Ruleset, rulesetId) || rulesetId,
    [rulesetId],
  );
  const ruleset = useMemo(
    () =>
      rulesets.find(
        (r: any) =>
          r.id === rulesetId ||
          r.id === resolvedRulesetId ||
          resolveIdParam(IntAliasNamespaceType.Ruleset, r.id) === rulesetId,
      ),
    [rulesets, rulesetId, resolvedRulesetId],
  );

  const rule = useMemo(
    () => ruleset?.rules.find((r: any) => r.id === ruleId) as EditorRule | undefined,
    [ruleset, ruleId],
  );

  const navigateBack = async () => {
    if (!ruleset) return;

    await navigate({
      to: "/projects/$projectId/rulesets/$rulesetId",
      params: {
        projectId,
        rulesetId: toIntParam(IntAliasNamespaceType.Ruleset, ruleset.id),
      },
    });
  };

  if (!ruleset || !rule) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#06080d] text-slate-400 font-mono text-xs">
        Rule not found.
      </div>
    );
  }

  const isGuidedSimulation = new URLSearchParams(window.location.search).get("guided") === "1";

  if (isGuidedSimulation) {
    const toolCode = typeof rule.params?.toolCode === "string" ? rule.params.toolCode : "";
    const normalizedName = rule.name.toLowerCase();
    const isGreyscalePattern =
      toolCode === "T102" ||
      toolCode === "T116" ||
      toolCode === "greyscale_pattern_match" ||
      normalizedName.includes("pattern match") ||
      normalizedName.includes("greyscale pattern") ||
      normalizedName.includes("white box");
    const isPin1 =
      toolCode === "T103" ||
      toolCode === "T105" ||
      toolCode === "T117" ||
      toolCode === "pin1_config" ||
      toolCode === "pin1_orientation" ||
      normalizedName.includes("orientation") ||
      normalizedName.includes("pin 1") ||
      normalizedName.includes("pin1");
    const guidedImageRef =
      typeof (rule.params as any)?.imageRef === "string"
        ? ((rule.params as any).imageRef as string)
        : project?.inspectionImageRef;

    return (
      <GuidedRuleConfigPreview
        rule={rule}
        imageRef={guidedImageRef}
        isPin1={isPin1}
        isGreyscalePattern={isGreyscalePattern}
      />
    );
  }

  return (
    <RuleToolConfigPanel
      key={rule.id}
      ruleset={ruleset}
      rule={rule}
      imageRef={project?.inspectionImageRef}
      onExit={() => void navigateBack()}
    />
  );
}

function GuidedRuleConfigPreview({
  rule,
  imageRef,
  isPin1,
  isGreyscalePattern,
}: {
  rule: EditorRule;
  imageRef?: string;
  isPin1: boolean;
  isGreyscalePattern: boolean;
}): JSX.Element {
  const toolCode = typeof rule.params?.toolCode === "string" ? rule.params.toolCode : "T102";
  const pinCfg = (rule.params as any)?.pin1Config;
  const searchRegion = (rule.params as any)?.searchRegion ?? {
    x: rule.x,
    y: rule.y,
    width: rule.width,
    height: rule.height,
  };
  const patternRegion = (rule.params as any)?.patternRegion;
  const boxes = Array.isArray((rule.params as any)?.referenceBoxes)
    ? ((rule.params as any).referenceBoxes as Array<any>)
    : [];

  return (
    <div
      data-tour="rule-config-editor"
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#06080d] text-slate-100 font-sans antialiased"
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 bg-[#0a0d14] px-4">
        <div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
            Guided Configuration
          </div>
          <h1 className="font-mono text-sm font-black uppercase tracking-wider text-white">
            {rule.name}
          </h1>
        </div>
        <span className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 font-mono text-xs font-bold text-cyan-200">
          {toolCode}
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px] overflow-hidden">
        <div className="relative flex min-h-0 items-center justify-center overflow-hidden bg-black p-6">
          <div className="relative max-h-full max-w-full">
            {imageRef ? (
              <img
                src={imageRef}
                alt="Guided rule setup"
                className="max-h-[calc(100vh-8rem)] max-w-full rounded border border-white/20 object-contain"
              />
            ) : (
              <div className="flex h-80 w-[520px] items-center justify-center rounded border border-dashed border-white/20 text-xs uppercase tracking-wider text-white/40">
                No image registered
              </div>
            )}
            <div className="pointer-events-none absolute inset-0">
              {isPin1 && pinCfg ? (
                <>
                  <div
                    className="absolute rounded border-2 border-cyan-300/90 bg-cyan-300/10 shadow-[0_0_16px_rgba(34,211,238,0.45)]"
                    style={{
                      left: `${(searchRegion.x / 247) * 100}%`,
                      top: `${(searchRegion.y / 404) * 100}%`,
                      width: `${(searchRegion.width / 247) * 100}%`,
                      height: `${(searchRegion.height / 404) * 100}%`,
                    }}
                  />
                  <div
                    className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.8)]"
                    style={{
                      left: `${((pinCfg.centerX ?? pinCfg.registeredPin1?.x ?? 60) / 247) * 100}%`,
                      top: `${((pinCfg.centerY ?? pinCfg.registeredPin1?.y ?? 280) / 404) * 100}%`,
                    }}
                  />
                </>
              ) : null}
              {isGreyscalePattern && patternRegion ? (
                <>
                  <div
                    className="absolute rounded border-2 border-amber-300/90 bg-amber-300/10 shadow-[0_0_16px_rgba(251,191,36,0.35)]"
                    style={{
                      left: `${(patternRegion.x / 247) * 100}%`,
                      top: `${(patternRegion.y / 404) * 100}%`,
                      width: `${(patternRegion.width / 247) * 100}%`,
                      height: `${(patternRegion.height / 404) * 100}%`,
                    }}
                  />
                  {boxes.slice(0, 8).map((box) => (
                    <div
                      key={box.number}
                      className="absolute rounded-sm border border-emerald-300 bg-emerald-300/15"
                      style={{
                        left: `${(box.x / 247) * 100}%`,
                        top: `${(box.y / 404) * 100}%`,
                        width: `${(box.width / 247) * 100}%`,
                        height: `${(box.height / 404) * 100}%`,
                      }}
                    />
                  ))}
                </>
              ) : null}
            </div>
          </div>
        </div>

        <aside
          data-tour="rule-config-summary-panel"
          className="flex min-h-0 flex-col border-l border-white/10 bg-[#0d1218]"
        >
          <div className="border-b border-white/10 p-4">
            <h2 className="font-mono text-xs font-black uppercase tracking-wider text-white">
              {isPin1 ? "PIN1 Configuration" : "Greyscale Pattern Configuration"}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Lightweight guided preview. The real editor remains available outside the presentation flow.
            </p>
          </div>
          <div className="grid gap-3 p-4 text-xs">
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                Search Region
              </div>
              <div className="mt-1 font-mono font-bold text-white">
                {Math.round(searchRegion.x ?? 0)}, {Math.round(searchRegion.y ?? 0)} · {Math.round(searchRegion.width ?? 0)} x {Math.round(searchRegion.height ?? 0)}
              </div>
            </div>
            {isPin1 ? (
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-emerald-200">
                  Registered Pin
                </div>
                <div className="mt-1 font-mono font-bold text-emerald-100">
                  X {Math.round(pinCfg?.centerX ?? pinCfg?.registeredPin1?.x ?? 0)} · Y {Math.round(pinCfg?.centerY ?? pinCfg?.registeredPin1?.y ?? 0)}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-emerald-200">
                  Pattern Boxes
                </div>
                <div className="mt-1 font-mono font-bold text-emerald-100">
                  {boxes.length} active reference boxes
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
