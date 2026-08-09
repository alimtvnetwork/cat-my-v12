// SectionTopBar: pinned top-of-screen sub-option bar per Plan 34 SS-01.
// Each `section` id maps to a fixed sub-option list (label + target route).
// Presentational only: no data fetching, no store access.
import { Link } from "@tanstack/react-router";
import type { ReactElement } from "react";

export enum SectionIdType {
  Home = "home",
  Project = "project",
  Ruleset = "ruleset",
  TrialRun = "trial-run",
  AiTesting = "ai-testing",
}
export type SectionId = SectionIdType;

export interface SectionOption {
  id: string;
  label: string;
  to: string;
}

// Route strings use `$projectId` / `$rulesetId` placeholders per TanStack
// file-based routing. Concrete params come from callers via `params` on the
// rendered <Link>; the presentational bar passes them through untouched.
// eslint-disable-next-line react-refresh/only-export-components -- section map is authored alongside the bar that renders it; tests import it.
export const SECTION_OPTIONS: Record<SectionId, SectionOption[]> = {
  home: [
    { id: "setup", label: "Setup", to: "/setup" },
    { id: "projects", label: "Projects", to: "/projects" },
    { id: "trial-run", label: "Trial run", to: "/trial-run" },
    { id: "ai-testing", label: "AI testing", to: "/ai-testing" },
  ],
  project: [
    { id: "overview", label: "Overview", to: "/projects/$projectId" },
    { id: "camera", label: "Camera", to: "/projects/$projectId/camera" },
    { id: "rulesets", label: "Rule sets", to: "/projects/$projectId/rulesets" },
    { id: "categories", label: "Categories", to: "/projects/$projectId/categories" },
    { id: "runs", label: "Runs", to: "/projects/$projectId/runs" },
    { id: "trial-run", label: "Trial run", to: "/projects/$projectId/trial-run" },
    { id: "ai-testing", label: "AI testing", to: "/projects/$projectId/ai-testing" },
  ],
  ruleset: [
    { id: "layers", label: "Layers", to: "/projects/$projectId/rulesets/$rulesetId" },
    { id: "rulesets", label: "All rule sets", to: "/projects/$projectId/rulesets" },
    { id: "run-on-image", label: "Run on image", to: "/projects/$projectId/trial-run" },
  ],
  "trial-run": [
    { id: "overview", label: "Trial run", to: "/projects/$projectId/trial-run" },
    { id: "runs", label: "Runs", to: "/projects/$projectId/runs" },
    { id: "rulesets", label: "Rule sets", to: "/projects/$projectId/rulesets" },
  ],
  "ai-testing": [
    { id: "dataset", label: "Dataset", to: "/projects/$projectId/ai-testing" },
    { id: "history", label: "History", to: "/projects/$projectId/ai-testing-history" },
  ],
};

export interface SectionTopBarProps {
  section: SectionId;
  active?: string;
  params?: Partial<Record<"projectId" | "rulesetId", string>>;
}

export function SectionTopBar({ section, active, params }: SectionTopBarProps): ReactElement {
  const options = SECTION_OPTIONS[section];

  return (
    <nav
      aria-label={`${section} sub-navigation`}
      data-section={section}
      className="flex min-w-0 items-center gap-hmi-2 border-b border-ca-border bg-ca-panel-2 px-hmi-4 py-hmi-1"
    >
      <div className="flex min-w-0 flex-1 items-center gap-hmi-2 overflow-x-auto">
        {options.map((opt) => {
          const isActive = opt.id === active;

          return (
            <Link
              key={opt.id}
              to={opt.to}
              params={params}
              preload="intent"
              data-option={opt.id}
              data-active={isActive ? "true" : "false"}
              className={`inline-flex shrink-0 items-center rounded px-hmi-3 py-hmi-1 text-hmi-body transition ${
                isActive
                  ? "bg-ca-panel text-ca-ink shadow-hmi-panel"
                  : "text-ca-ink-muted hover:bg-ca-panel hover:text-ca-ink"
              }`}
            >
              {opt.label}
            </Link>
          );
        })}
      </div>
      {/* Portal target: EditorTopBar renders its Saved / Reset / Search /
          Save / Preview / Publish cluster here so those actions share the
          row with the section tabs (see assets/issues/21). */}
      <div
        id="section-topbar-actions-slot"
        data-slot="section-topbar-actions"
        className="flex shrink-0 items-center gap-hmi-2 pl-hmi-2"
      />
    </nav>
  );
}
