export enum HomeJobStatusType {
  Ready = "Ready",
  Running = "Running",
  Hold = "Hold",
}

export enum HomeTaskStatusType {
  Ready = "Ready",
  Draft = "Draft",
  NeedsReview = "NeedsReview",
}

export type HomeTask = {
  id: string;
  name: string;
  program: string;
  status: HomeTaskStatusType;
  updated: string;
  yieldPct: string;
};

export type HomeJob = {
  id: string;
  lot: string;
  part: string;
  status: HomeJobStatusType;
  operator: string;
  tasks: HomeTask[];
};

function task(
  id: string,
  name: string,
  program: string,
  status: HomeTaskStatusType,
  yieldPct: string,
): HomeTask {
  return { id, name, program, status, updated: "Today 13:42", yieldPct };
}

export const HOME_JOBS: HomeJob[] = [
  {
    id: "job-qfn-2407-a",
    lot: "QFN-2407-A",
    part: "QFN 5x5 - 32 lead",
    status: HomeJobStatusType.Ready,
    operator: "OP-014",
    tasks: [
      task("task-top-mark", "Top mark OCR", "PRG-QFN-MARK-03", HomeTaskStatusType.Ready, "98.7%"),
      task(
        "task-lead-coplanar",
        "Lead coplanarity",
        "PRG-QFN-LEAD-02",
        HomeTaskStatusType.Ready,
        "99.1%",
      ),
      task("task-package-edge", "Package edge", "PRG-QFN-EDGE-01", HomeTaskStatusType.Draft, "-"),
    ],
  },
  {
    id: "job-qfn-2406-r",
    lot: "QFN-2406-R",
    part: "QFN 4x4 - 24 lead",
    status: HomeJobStatusType.Hold,
    operator: "OP-009",
    tasks: [
      task(
        "task-solder-void",
        "Solder void check",
        "PRG-QFN-VOID-04",
        HomeTaskStatusType.NeedsReview,
        "94.2%",
      ),
      task(
        "task-corner-chip",
        "Corner chip detect",
        "PRG-QFN-CHIP-01",
        HomeTaskStatusType.Ready,
        "97.5%",
      ),
    ],
  },
];

export namespace HomeJobStatusType {
  export function isReady(val: string | null | undefined): boolean {
    return val === HomeJobStatusType.Ready;
  }
  export function isRunning(val: string | null | undefined): boolean {
    return val === HomeJobStatusType.Running;
  }
  export function isHold(val: string | null | undefined): boolean {
    return val === HomeJobStatusType.Hold;
  }
}

export namespace HomeTaskStatusType {
  export function isReady(val: string | null | undefined): boolean {
    return val === HomeTaskStatusType.Ready;
  }
  export function isDraft(val: string | null | undefined): boolean {
    return val === HomeTaskStatusType.Draft;
  }
  export function isNeedsReview(val: string | null | undefined): boolean {
    return val === HomeTaskStatusType.NeedsReview;
  }
}
