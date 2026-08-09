/**
 * Plan 64 step 66: registry of running long-ops (validate, capture, run, import).
 * Any surface can register an op; the RunningPill (step 65) subscribes and
 * renders. Kept intentionally minimal, no persistence.
 */
import { create } from "zustand";

export enum RunningOpKindType {
  Validate = "validate",
  Capture = "capture",
  Run = "run",
  Import = "import",
  Export = "export",
}
export type RunningOpKind = RunningOpKindType;

export interface RunningOp {
  id: string;
  kind: RunningOpKind;
  label: string;
  startedAt: number;
  progress?: number;
  onStop?: () => void;
  /**
   * Plan 66 SH-05: optional route the RunningPill navigates to when the
   * user clicks the op body. If omitted, the pill still renders but the
   * click target is a no-op (Stop still works).
   */
  targetRoute?: string;
}

interface RunningOpsStore {
  ops: RunningOp[];
  start: (op: Omit<RunningOp, "startedAt"> & { startedAt?: number }) => void;
  update: (id: string, patch: Partial<RunningOp>) => void;
  stop: (id: string) => void;
  clear: () => void;
}

export const useRunningOpsStore = create<RunningOpsStore>((set, get) => ({
  ops: [],
  start: (op) => {
    const full: RunningOp = { startedAt: Date.now(), ...op };
    console.info("[running-ops] start", full.id, full.kind, full.label);
    set({ ops: [...get().ops, full] });
  },
  update: (id, patch) => set({ ops: get().ops.map((o) => (o.id === id ? { ...o, ...patch } : o)) }),
  stop: (id) => {
    const op = get().ops.find((o) => o.id === id);

    if (op?.onStop) {
      try {
        op.onStop();
      } catch (err) {
        console.error("[running-ops] onStop threw", id, err);
      }
    }

    console.info("[running-ops] stop", id);
    set({ ops: get().ops.filter((o) => o.id !== id) });
  },
  clear: () => set({ ops: [] }),
}));
