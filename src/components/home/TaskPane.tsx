import { Link } from "@tanstack/react-router";
import type { HomeJob, HomeTask } from "./data";
import { formatIdentifierLabel } from "@/lib/display-labels";

export function TaskPane({ job }: { job: HomeJob }) {
  return (
    <section
      aria-label="Tasks"
      role="region"
      className="flex h-full min-w-0 flex-1 flex-col bg-ca-bg"
    >
      <header className="border-b border-ca-border bg-ca-panel px-hmi-4 py-hmi-3">
        <p className="text-hmi-caption uppercase text-ca-ink-muted">Selected job</p>
        <h2 className="mt-1 text-hmi-header font-semibold text-ca-ink">{job.lot}</h2>
      </header>
      <div className="grid grid-cols-12 border-b border-ca-border bg-ca-chrome px-hmi-4 py-hmi-2 text-hmi-caption uppercase text-ca-ink-muted">
        <span className="col-span-4">Task</span>
        <span className="col-span-3">Program</span>
        <span className="col-span-2">Yield</span>
        <span className="col-span-3">Action</span>
      </div>
      <div className="divide-y divide-ca-border overflow-auto">
        {job.tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </div>
    </section>
  );
}

function TaskRow({ task }: { task: HomeTask }) {
  return (
    <article className="grid grid-cols-12 items-center gap-hmi-2 px-hmi-4 py-hmi-3 text-hmi-body hover:bg-ca-panel">
      <div className="col-span-4 min-w-0">
        <p className="truncate font-semibold text-ca-ink">{task.name}</p>
        <p className="text-hmi-caption text-ca-ink-muted">
          {formatIdentifierLabel(task.status)} - {task.updated}
        </p>
      </div>
      <p className="col-span-3 truncate hmi-tabular text-ca-ink-muted">{task.program}</p>
      <p className="col-span-2 hmi-tabular text-ca-ink">{task.yieldPct}</p>
      <div className="col-span-3 flex gap-hmi-2">
        <Link
          to="/setup"
          className="inline-flex items-center min-h-10 rounded border border-ca-border px-hmi-4 py-hmi-2 text-ca-ink hover:bg-ca-panel-2"
        >
          Setup
        </Link>
        <Link
          to="/run"
          className="inline-flex items-center min-h-10 rounded bg-ca-primary px-hmi-4 py-hmi-2 text-ca-bg hover:opacity-90"
        >
          Run
        </Link>
      </div>
    </article>
  );
}
