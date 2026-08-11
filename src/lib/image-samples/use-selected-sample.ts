// Persisted "which sample is currently selected" for a given project's
// Run / Result flow. Keying by stable `orderIndex` (with sample id as a
// secondary anchor) means the selection survives reloads even if the
// full sample list is rehydrated in a different order, and it drifts
// with the sample rather than with its position when other samples are
// inserted or removed above it.
//
// Contract:
//   - Storage key: `project-run-selection:v1:<projectId>`.
//   - Persisted shape: `{ id: string | null, orderIndex: number | null }`.
//   - Resolution on read: prefer id match; fall back to matching
//     `orderIndex`; fall back to the first sample; return `null` when
//     there are no samples.

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ImageSample } from "./model";

const STORAGE_PREFIX = "project-run-selection:v1:";

interface Persisted {
  id: string | null;
  orderIndex: number | null;
}

function storageKey(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`;
}

function readPersisted(projectId: string): Persisted {
  if (typeof window === "undefined") return { id: null, orderIndex: null };
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));

    if (!raw) return { id: null, orderIndex: null };
    const parsed = JSON.parse(raw) as Partial<Persisted>;

    return {
      id: typeof parsed.id === "string" ? parsed.id : null,
      orderIndex:
        typeof parsed.orderIndex === "number" && Number.isFinite(parsed.orderIndex)
          ? parsed.orderIndex
          : null,
    };
  } catch {
    return { id: null, orderIndex: null };
  }
}

function writePersisted(projectId: string, value: Persisted): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(projectId), JSON.stringify(value));
  } catch {
    /* quota / private mode / disabled storage: selection is transient */
  }
}

export interface UseSelectedSample {
  selected: ImageSample | null;
  selectedIndex: number;
  count: number;
  select: (id: string) => void;
  next: () => void;
  prev: () => void;
}

export function resolveSelection(
  samples: readonly ImageSample[],
  persisted: Persisted,
): ImageSample | null {
  if (samples.length === 0) return null;

  if (persisted.id) {
    const byId = samples.find((s) => s.id === persisted.id);

    if (byId) return byId;
  }

  if (persisted.orderIndex !== null) {
    const byOrder = samples.find((s) => s.orderIndex === persisted.orderIndex);

    if (byOrder) return byOrder;
  }

  return samples[0] ?? null;
}

export function useSelectedSample(
  projectId: string,
  samples: readonly ImageSample[],
): UseSelectedSample {
  const [persisted, setPersisted] = useState<Persisted>(() => readPersisted(projectId));

  // Re-hydrate when the project changes so switching projects doesn't
  // leak the previous project's selection.
  useEffect(() => {
    setPersisted(readPersisted(projectId));
  }, [projectId]);

  const selected = useMemo(() => resolveSelection(samples, persisted), [samples, persisted]);
  const selectedIndex = useMemo(
    () => (selected ? samples.findIndex((s) => s.id === selected.id) : -1),
    [samples, selected],
  );

  // Auto-heal a stale persisted record: if the resolved sample differs
  // from what was stored (e.g. the persisted id no longer exists), push
  // the resolved anchor back to storage so the next reload skips the
  // fallback branch.
  const isNonSelected = !selected;

  useEffect(() => {
    if (isNonSelected) return;
    const anchor: Persisted = {
      id: selected.id,
      orderIndex: selected.orderIndex ?? null,
    };

    if (anchor.id !== persisted.id || anchor.orderIndex !== persisted.orderIndex) {
      writePersisted(projectId, anchor);
      setPersisted(anchor);
    }
  }, [projectId, selected, persisted]);

  const commit = useCallback(
    (sample: ImageSample | null) => {
      const next: Persisted = sample
        ? { id: sample.id, orderIndex: sample.orderIndex ?? null }
        : { id: null, orderIndex: null };
      writePersisted(projectId, next);
      setPersisted(next);
    },
    [projectId],
  );

  const select = useCallback(
    (id: string) => {
      const target = samples.find((s) => s.id === id) ?? null;
      commit(target);
    },
    [samples, commit],
  );

  const next = useCallback(() => {
    if (samples.length === 0) return;
    const i = selectedIndex < 0 ? 0 : (selectedIndex + 1) % samples.length;
    commit(samples[i] ?? null);
  }, [samples, selectedIndex, commit]);

  const prev = useCallback(() => {
    if (samples.length === 0) return;
    const i = selectedIndex < 0 ? 0 : (selectedIndex - 1 + samples.length) % samples.length;
    commit(samples[i] ?? null);
  }, [samples, selectedIndex, commit]);

  return {
    selected,
    selectedIndex,
    count: samples.length,
    select,
    next,
    prev,
  };
}