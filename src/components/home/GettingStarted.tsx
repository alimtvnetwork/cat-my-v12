/**
 * Plan 65 steps 24-25 (SS-05): numbered getting-started workflow for Home.
 *
 * Renders a Photoshop-style vertical checklist that reads step completion
 * directly from `useProjectStore` (persisted at `ca:projects:v1`) so it
 * stays accurate without a separate onboarding store:
 *
 *  1. Create a project (any project in the store).
 *  2. Add a ruleset to that project.
 *  3. Add at least one rule to a ruleset.
 *  4. Run a trial (heuristic: any ruleset with `imageRef`).
 *
 * Each row shows a numeric badge (filled when done), a title + short
 * description, and a "Go" link to the exact route that advances the
 * step. Rows are keyboard-focusable via the wrapping `<Link>`.
 *
 * Root cause of issue 23: Home had no workflow guidance. This is the
 * minimum surface that fixes it without inventing a new store.
 */
import { Link } from "@tanstack/react-router";
import { Section } from "@/components/ui/section";
import { Check, ArrowRight } from "lucide-react";
import { useProjectStore } from "@/lib/projects/store";

export enum StepStatusType {
  Done = "done",
  Next = "next",
  Todo = "todo",
}
export type StepStatus = StepStatusType;

interface Step {
  readonly n: number;
  readonly title: string;
  readonly description: string;
  readonly to: string;
  readonly isDone: boolean;
}

export function GettingStarted(): React.JSX.Element | null {
  const projects = useProjectStore((s) => s.projects);
  const rulesets = useProjectStore((s) => s.rulesets);

  const projectList = Object.values(projects);
  const rulesetList = Object.values(rulesets);
  const firstProject = projectList[0];
  const firstRuleset = rulesetList[0];

  const rawSteps: readonly Step[] = [
    {
      n: 1,
      title: "Create a project",
      description: "Name the line and pick a camera.",
      to: "/projects?new=1",
      isDone: projectList.length > 0,
    },
    {
      n: 2,
      title: "Add a ruleset",
      description: "Group the rules you want to run together.",
      to: firstProject ? `/projects/${firstProject.id}/rulesets` : "/projects",
      isDone: rulesetList.length > 0,
    },
    {
      n: 3,
      title: "Draw a rule",
      description: "Add at least one detector so runs have something to check.",
      to:
        firstProject && firstRuleset
          ? `/projects/${firstProject.id}/rulesets/${firstRuleset.id}`
          : "/setup",
      isDone: rulesetList.some((r) => r.rules.length > 0),
    },
    {
      n: 4,
      title: "Run a trial",
      description: "Score the ruleset against a reference image.",
      to: "/run",
      isDone: rulesetList.some((r) => Boolean(r.imageRef) && r.rules.length > 0),
    },
  ] as const;

  const firstTodoIdx = rawSteps.findIndex((s) => !s.isDone);
  const steps = rawSteps.map((s, i) => {
    let status: StepStatus;

    if (s.isDone) {
      status = StepStatusType.Done;
    } else if (i === firstTodoIdx) {
      status = StepStatusType.Next;
    } else {
      status = StepStatusType.Todo;
    }

    return { ...s, status } as Step & { status: StepStatus };
  });

  const completedCount = steps.filter((s) => s.isDone).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <Section
      titleId="getting-started-title"
      title={
        <span
          className="font-display font-black uppercase leading-none tracking-tight text-ca-ink"
          style={{ fontSize: "var(--home-section-title-size)" }}
        >
          Getting started
        </span>
      }
      headerAside={
        <div className="flex items-center gap-3 pl-hmi-3 font-mono text-xs">
          <div className="h-2 w-28 overflow-hidden rounded-full border border-ca-border/80 bg-ca-bg/90 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-ca-primary to-ca-ok shadow-[0_0_10px_var(--ca-ok)] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-ca-ink-muted">
            <strong className="text-ca-ink font-semibold">{completedCount}</strong> of {steps.length} complete
          </span>
        </div>
      }
    >
      <ol className="flex flex-col gap-hmi-2">
        {steps.map((s) => (
          <li key={s.n}>
            <Link
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              to={s.to as any}
              data-testid={`getting-started-step-${s.n}`}
              data-done={s.isDone ? "true" : "false"}
              data-status={s.status}
              className="group relative flex items-center gap-4 rounded-xl border border-ca-border/80 bg-ca-panel/85 px-4 py-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_2px_8px_-2px_rgba(0,0,0,0.3)] backdrop-blur-md transition-all duration-200 hover:border-ca-primary/50 hover:bg-ca-panel-2 hover:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.6),0_0_16px_-4px_color-mix(in_oklab,var(--ca-primary)_20%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ca-focus"
            >
              <span
                aria-hidden
                className={
                  s.isDone
                    ? "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ca-ok/50 bg-ca-ok/15 text-ca-ok shadow-[0_0_14px_color-mix(in_oklab,var(--ca-ok)_35%,transparent),inset_0_1px_0_0_rgba(255,255,255,0.15)]"
                    : s.status === StepStatusType.Next
                      ? "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ca-primary/50 bg-ca-primary/15 text-ca-primary shadow-[0_0_14px_color-mix(in_oklab,var(--ca-primary)_35%,transparent),inset_0_1px_0_0_rgba(255,255,255,0.15)]"
                      : "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ca-border/80 bg-ca-panel text-ca-ink-muted shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
                }
              >
                {s.isDone ? (
                  <Check size={16} strokeWidth={2.5} />
                ) : (
                  <span className="text-hmi-body font-bold font-mono">{s.n}</span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-hmi-body font-semibold text-ca-ink">{s.title}</p>
                <p className="truncate text-hmi-caption text-ca-ink-muted font-medium">{s.description}</p>
              </div>
              <StatusPill status={s.status} />
              <ArrowRight
                size={16}
                aria-hidden
                className="shrink-0 text-ca-ink-muted transition-transform group-hover:translate-x-1 group-hover:text-ca-ink"
              />
            </Link>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function StatusPill({ status }: { status: StepStatus }) {
  const map: Record<StepStatus, { label: string; cls: string }> = {
    done: {
      label: "Done",
      cls: "border-ca-ok/50 bg-ca-ok/15 text-ca-ok shadow-[0_0_10px_color-mix(in_oklab,var(--ca-ok)_30%,transparent)]",
    },
    next: {
      label: "Next up",
      cls: "border-ca-primary/60 bg-ca-primary/20 text-ca-primary font-bold shadow-[0_0_10px_color-mix(in_oklab,var(--ca-primary)_35%,transparent)]",
    },
    todo: {
      label: "Todo",
      cls: "border-ca-border/80 bg-ca-panel/80 text-ca-ink-muted",
    },
  };
  const { label, cls } = map[status];

  return (
    <span
      className={`shrink-0 rounded-full border px-3 py-0.5 text-hmi-caption font-semibold uppercase tracking-wider ${cls}`}
      data-status={status}
    >
      {label}
    </span>
  );
}
