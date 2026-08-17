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
  readonly done: boolean;
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
      done: projectList.length > 0,
    },
    {
      n: 2,
      title: "Add a ruleset",
      description: "Group the rules you want to run together.",
      to: firstProject ? `/projects/${firstProject.id}/rulesets` : "/projects",
      done: rulesetList.length > 0,
    },
    {
      n: 3,
      title: "Draw a rule",
      description: "Add at least one detector so runs have something to check.",
      to:
        firstProject && firstRuleset
          ? `/projects/${firstProject.id}/rulesets/${firstRuleset.id}`
          : "/setup",
      done: rulesetList.some((r) => r.rules.length > 0),
    },
    {
      n: 4,
      title: "Run a trial",
      description: "Score the ruleset against a reference image.",
      to: "/run",
      done: rulesetList.some((r) => !!r.imageRef && r.rules.length > 0),
    },
  ] as const;

  // Plan 65 step 16: derive per-step status. The first not-done step is
  // "next" (the operator's actual next action); every later not-done step
  // is "todo". This turns a flat checklist into a workflow with a clear
  // pointer to what to do next.
  const firstTodoIdx = rawSteps.findIndex((s) => !s.done);
  const steps = rawSteps.map((s, i) => {
    let status: StepStatus;

    if (s.done) status = StepStatusType.Done;
    else if (i === firstTodoIdx) status = StepStatusType.Next;
    else status = StepStatusType.Todo;

    return { ...s, status } as Step & { status: StepStatus };
  });
  const completed = steps.filter((s) => s.done).length;

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
        <span className="pl-hmi-3">
          {completed} of {steps.length} complete
        </span>
      }
    >
      <ol className="flex flex-col gap-hmi-2">
        {steps.map((s) => (
          <li key={s.n}>
            <Link
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              to={s.to as any}
              data-testid={`getting-started-step-${s.n}`}
              data-done={s.done ? "true" : "false"}
              data-status={s.status}
              className="group flex items-center gap-hmi-3 rounded-md border border-ca-border bg-ca-panel-2/40 px-hmi-3 py-hmi-3 hover:border-ca-primary/60 hover:bg-ca-panel-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ca-focus"
            >
              <span
                aria-hidden
                className={
                  s.done
                    ? "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ca-ok/20 text-ca-ok ring-1 ring-ca-ok/40"
                    : "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ca-panel text-ca-ink-muted ring-1 ring-ca-border"
                }
              >
                {s.done ? (
                  <Check size={16} />
                ) : (
                  <span className="text-hmi-body font-semibold">{s.n}</span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-hmi-body font-medium text-ca-ink">{s.title}</p>
                <p className="truncate text-hmi-caption text-ca-ink-muted">{s.description}</p>
              </div>
              <StatusPill status={s.status} />
              <ArrowRight
                size={16}
                aria-hidden
                className="shrink-0 text-ca-ink-muted transition group-hover:translate-x-0.5 group-hover:text-ca-ink"
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
      cls: "border-ca-ok/40 bg-ca-ok/15 text-ca-ok",
    },
    next: {
      label: "Next up",
      cls: "border-ca-primary/60 bg-ca-primary/15 text-ca-ink",
    },
    todo: {
      label: "Todo",
      cls: "border-ca-border bg-ca-panel text-ca-ink-muted",
    },
  };
  const { label, cls } = map[status];

  return (
    <span
      className={`shrink-0 rounded-full border px-hmi-2 py-0.5 text-hmi-caption font-medium uppercase tracking-wide ${cls}`}
      data-status={status}
    >
      {label}
    </span>
  );
}
