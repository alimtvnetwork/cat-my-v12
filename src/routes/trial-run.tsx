import { EmptyStateActionVariantType } from "@/components/common/EmptyState";
import { IntAliasNamespaceType } from "@/lib/ids/int-alias";
import { SectionIdType } from "@/components/nav/SectionTopBar";
// Top-level Trial run picker. Home tile "Trial run" lands here; user picks
// a project, then routes into /projects/$id/trial-run. One thing per page.
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { PlayCircle, FolderOpen } from "lucide-react";
import { HmiShell } from "@/components/hmi";
import { SectionTopBar } from "@/components/nav/SectionTopBar";
import { useProjectStore } from "@/lib/projects/store";
import { EmptyState } from "@/components/common/EmptyState";
import { useSeededEmptyStateAction } from "@/lib/seed/useSeededEmptyStateAction";
import { toIntParam } from "@/lib/ids/int-alias";

export const Route = createFileRoute("/trial-run")({
  head: () => ({
    meta: [
      { title: "Trial run, Control Automation" },
      { name: "description", content: "Pick a project to run a ruleset on an uploaded image." },
      { property: "og:title", content: "Trial run, Control Automation" },
      { property: "og:type", content: "website" },
      {
        property: "og:description",
        content: "Run a ruleset against a single image inside any project.",
      },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrialRunPicker,
});

function TrialRunPicker() {
  return (
    <ProjectPicker
      title="Trial run"
      lead="Pick a project to run a ruleset on an image."
      Icon={PlayCircle}
      subroute="trial-run"
      active="trial-run"
    />
  );
}

export function ProjectPicker({
  title,
  lead,
  Icon,
  subroute,
  active,
}: {
  title: string;
  lead: string;
  Icon: typeof PlayCircle;
  subroute: "trial-run" | "ai-testing";
  active: "trial-run" | "ai-testing";
}) {
  const projects = useProjectStore((s) => s.projects);
  const list = Object.values(projects).sort((a, b) => b.createdAt - a.createdAt);
  const navigate = useNavigate();
  const seeded = useSeededEmptyStateAction("trial.run");

  return (
    <HmiShell title={title}>
      <SectionTopBar section={SectionIdType.Home} active={active} />
      <div className="flex min-w-0 flex-1 flex-col overflow-auto p-hmi-6">
        <div className="mx-auto w-full max-w-4xl">
          <header className="mb-hmi-5">
            <h1 className="font-display text-hmi-title font-extrabold uppercase tracking-wide text-ca-ink">
              {title}
            </h1>
            <p className="mt-hmi-2 text-hmi-body text-ca-ink-muted">{lead}</p>
          </header>

          {list.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title={seeded.title ?? "No projects yet"}
              description={
                seeded.body ?? `Create a project first, then come back to ${title.toLowerCase()}.`
              }
              actions={[
                ...(seeded.cta
                  ? [
                      {
                        label: seeded.cta.label,
                        onClick: seeded.cta.onClick,
                        testId: seeded.cta.testId,
                        variant: EmptyStateActionVariantType.Secondary as const,
                      },
                    ]
                  : []),
                {
                  label: "Go to projects",
                  onClick: () => navigate({ to: "/projects" }),
                  testId: "trial-run-empty-cta",
                },
              ]}
              testId={`${subroute}-empty`}
            />
          ) : (
            <ul className="grid grid-cols-1 gap-hmi-3 md:grid-cols-2">
              {list.map((p) => (
                <li key={p.id}>
                  <Link
                    to={
                      subroute === "trial-run"
                        ? "/projects/$projectId/trial-run"
                        : "/projects/$projectId/ai-testing"
                    }
                    params={{ projectId: toIntParam(IntAliasNamespaceType.Project, p.id) }}
                    className="group flex items-center gap-hmi-3 rounded-lg border border-ca-border bg-ca-panel p-hmi-4 shadow-hmi-panel transition hover:border-ca-select focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-ca-border bg-ca-panel-2 text-ca-select">
                      <Icon aria-hidden size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-hmi-header font-extrabold text-ca-ink">
                        {p.name}
                      </span>
                      <span className="mt-hmi-1 block text-hmi-caption text-ca-ink-muted">
                        {p.rulesetIds.length} {p.rulesetIds.length === 1 ? "rule set" : "rule sets"}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </HmiShell>
  );
}
