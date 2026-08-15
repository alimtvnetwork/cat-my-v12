import type { HomeJob } from "./data";
import { formatIdentifierLabel } from "@/lib/display-labels";

type JobListProps = {
  jobs: HomeJob[];
  selectedJobId: string;
  onSelect: (jobId: string) => void;
};

type JobRowProps = {
  job: HomeJob;
  selectedJobId: string;
  onSelect: (jobId: string) => void;
};

export function JobList({ jobs, selectedJobId, onSelect }: JobListProps) {
  return (
    <section
      aria-label="Jobs"
      role="region"
      className="h-full border-r border-ca-border bg-ca-panel"
    >
      <header className="border-b border-ca-border px-hmi-4 py-hmi-3">
        <h2 className="text-hmi-body font-semibold uppercase text-ca-ink">Jobs</h2>
        <p className="mt-1 text-hmi-caption text-ca-ink-muted">Root DB queue, newest first</p>
      </header>
      <div className="divide-y divide-ca-border">
        {jobs.map((job) => (
          <JobRow key={job.id} job={job} selectedJobId={selectedJobId} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}

function JobRow({ job, selectedJobId, onSelect }: JobRowProps) {
  const selected = job.id === selectedJobId;
  const state = selected ? "bg-ca-primary/15 text-ca-ink" : "text-ca-ink hover:bg-ca-panel-2";

  return (
    <button
      type="button"
      className={`block w-full min-h-10 px-hmi-4 py-hmi-3 text-left ${state}`}
      onClick={() => onSelect(job.id)}
    >
      <span className="flex items-center justify-between gap-hmi-3">
        <span className="font-semibold">{job.lot}</span>
        <span className="rounded bg-ca-panel-2 px-hmi-2 py-0.5 text-hmi-caption uppercase text-ca-ink-muted">
          {formatIdentifierLabel(job.status)}
        </span>
      </span>
      <span className="mt-1 block text-hmi-caption text-ca-ink-muted">{job.part}</span>
      <span className="mt-2 block hmi-tabular text-hmi-caption text-ca-ink-muted">
        {job.tasks.length} tasks - {job.operator}
      </span>
    </button>
  );
}
