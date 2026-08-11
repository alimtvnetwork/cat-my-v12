// Palette state facade (Plan 79 follow-up).
//
// Persists the body content and ordering of the right-bottom
// Layers / Channels / Paths palette per rule, via the shared
// ProjectRepositoryFacade (IndexedDB in the browser). No component
// touches storage directly, per spec/21-app/52-sdk-facade-pattern.md.
//
// Shape:
//   ca:palette-state:v1 -> Record<ruleId, PaletteState>
//
// The Layers tab still derives its row list from `rule.conditions`
// (that is the source of truth for ROIs); only visibility, lock, and
// display order for Channels + Paths are stored here.

import { makeProjectRepositoryFacade, type ProjectRepositoryFacade } from "@/lib/projects/facade";

export enum ChannelIdType {
  Rgb = "rgb",
  R = "r",
  G = "g",
  B = "b",
  A = "a",
}
export type ChannelId = ChannelIdType;

export interface ChannelEntry {
  id: ChannelId;
  label: string;
  visible: boolean;
  order: number;
}

export interface PathEntry {
  id: string;
  name: string;
  /** SVG path `d` attribute (compiled from Design Mode). */
  d: string;
  visible: boolean;
  order: number;
}

export interface PaletteState {
  channels: ChannelEntry[];
  paths: PathEntry[];
}

const STORAGE_KEY = "ca:palette-state:v1";

export const DEFAULT_CHANNELS: ChannelEntry[] = [
  { id: ChannelIdType.Rgb, label: "RGB", visible: true, order: 0 },
  { id: ChannelIdType.R, label: "Red", visible: true, order: 1 },
  { id: ChannelIdType.G, label: "Green", visible: true, order: 2 },
  { id: ChannelIdType.B, label: "Blue", visible: true, order: 3 },
  { id: ChannelIdType.A, label: "Alpha", visible: false, order: 4 },
];

export function defaultPaletteState(): PaletteState {
  return { channels: DEFAULT_CHANNELS.map((c) => ({ ...c })), paths: [] };
}

function reindex<T extends { order: number }>(rows: T[]): T[] {
  return rows
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((r, i) => ({ ...r, order: i }));
}

export interface PaletteFacade {
  get(ruleId: string): PaletteState;
  setChannels(ruleId: string, next: ChannelEntry[]): Promise<void>;
  setPaths(ruleId: string, next: PathEntry[]): Promise<void>;
  toggleChannel(ruleId: string, channelId: ChannelId): Promise<void>;
  togglePath(ruleId: string, pathId: string): Promise<void>;
  reorderChannel(ruleId: string, channelId: ChannelId, dir: -1 | 1): Promise<void>;
  reorderPath(ruleId: string, pathId: string, dir: -1 | 1): Promise<void>;
  addPath(ruleId: string, entry: Omit<PathEntry, "order">): Promise<void>;
  removePath(ruleId: string, pathId: string): Promise<void>;
  subscribe(listener: () => void): () => void;
  /** Test-only: force reload from storage. */
  __hydrate(): Promise<void>;
}

class IndexedDbPaletteFacade implements PaletteFacade {
  private map = new Map<string, PaletteState>();
  private listeners = new Set<() => void>();
  private hydrated = false;
  private hydrating: Promise<void> | null = null;

  constructor(private readonly repo: ProjectRepositoryFacade) {}

  private notify(): void {
    for (const fn of this.listeners) fn();
  }

  private async ensureHydrated(): Promise<void> {
    if (this.hydrated) return;

    if (this.hydrating) return this.hydrating;
    this.hydrating = (async () => {
      const raw = await this.repo.readItem(STORAGE_KEY);

      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Record<string, PaletteState>;
          for (const [id, state] of Object.entries(parsed)) {
            if (state && Array.isArray(state.channels) && Array.isArray(state.paths)) {
              this.map.set(id, state);
            }
          }
        } catch (err) {
          console.error("[palette/facade] hydrate parse failed", err);
        }
      }

      this.hydrated = true;
    })();

    return this.hydrating;
  }

  private async persist(): Promise<void> {
    const out: Record<string, PaletteState> = {};
    for (const [id, s] of this.map.entries()) out[id] = s;
    await this.repo.writeItem(STORAGE_KEY, JSON.stringify(out));
  }

  private ensureEntry(ruleId: string): PaletteState {
    let s = this.map.get(ruleId);

    if (!s) {
      s = defaultPaletteState();
      this.map.set(ruleId, s);
    }

    return s;
  }

  async __hydrate(): Promise<void> {
    this.hydrated = false;
    this.hydrating = null;
    this.map.clear();
    await this.ensureHydrated();
    this.notify();
  }

  get(ruleId: string): PaletteState {
    return this.ensureEntry(ruleId);
  }

  async setChannels(ruleId: string, next: ChannelEntry[]): Promise<void> {
    await this.ensureHydrated();
    const cur = this.ensureEntry(ruleId);
    this.map.set(ruleId, { ...cur, channels: reindex(next) });
    await this.persist();
    this.notify();
  }

  async setPaths(ruleId: string, next: PathEntry[]): Promise<void> {
    await this.ensureHydrated();
    const cur = this.ensureEntry(ruleId);
    this.map.set(ruleId, { ...cur, paths: reindex(next) });
    await this.persist();
    this.notify();
  }

  async toggleChannel(ruleId: string, channelId: ChannelId): Promise<void> {
    await this.ensureHydrated();
    const cur = this.ensureEntry(ruleId);
    const next = cur.channels.map((c) => (c.id === channelId ? { ...c, visible: !c.visible } : c));
    this.map.set(ruleId, { ...cur, channels: next });
    await this.persist();
    this.notify();
  }

  async togglePath(ruleId: string, pathId: string): Promise<void> {
    await this.ensureHydrated();
    const cur = this.ensureEntry(ruleId);
    const next = cur.paths.map((p) => (p.id === pathId ? { ...p, visible: !p.visible } : p));
    this.map.set(ruleId, { ...cur, paths: next });
    await this.persist();
    this.notify();
  }

  private async move<T extends { id: string; order: number }>(
    rows: T[],
    id: string,
    dir: -1 | 1,
  ): Promise<T[]> {
    const sorted = rows.slice().sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((r) => r.id === id);

    if (idx < 0) return rows;
    const swap = idx + dir;

    if (swap < 0 || swap >= sorted.length) return rows;
    const tmp = sorted[idx];
    sorted[idx] = sorted[swap];
    sorted[swap] = tmp;

    return sorted.map((r, i) => ({ ...r, order: i }));
  }

  async reorderChannel(ruleId: string, channelId: ChannelId, dir: -1 | 1): Promise<void> {
    await this.ensureHydrated();
    const cur = this.ensureEntry(ruleId);
    const next = await this.move(cur.channels, channelId, dir);
    this.map.set(ruleId, { ...cur, channels: next });
    await this.persist();
    this.notify();
  }

  async reorderPath(ruleId: string, pathId: string, dir: -1 | 1): Promise<void> {
    await this.ensureHydrated();
    const cur = this.ensureEntry(ruleId);
    const next = await this.move(cur.paths, pathId, dir);
    this.map.set(ruleId, { ...cur, paths: next });
    await this.persist();
    this.notify();
  }

  async addPath(ruleId: string, entry: Omit<PathEntry, "order">): Promise<void> {
    await this.ensureHydrated();
    const cur = this.ensureEntry(ruleId);
    const nextOrder = cur.paths.reduce((m, p) => Math.max(m, p.order + 1), 0);
    const paths = [...cur.paths, { ...entry, order: nextOrder }];
    this.map.set(ruleId, { ...cur, paths });
    await this.persist();
    this.notify();
  }

  async removePath(ruleId: string, pathId: string): Promise<void> {
    await this.ensureHydrated();
    const cur = this.ensureEntry(ruleId);
    const paths = reindex(cur.paths.filter((p) => p.id !== pathId));
    this.map.set(ruleId, { ...cur, paths });
    await this.persist();
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    void this.ensureHydrated().then(() => listener());

    return () => {
      this.listeners.delete(listener);
    };
  }
}

let cached: PaletteFacade | null = null;

export function makePaletteFacade(): PaletteFacade {
  if (cached) return cached;
  cached = new IndexedDbPaletteFacade(makeProjectRepositoryFacade());

  return cached;
}

/** Test-only override. */
export function __setPaletteFacadeForTests(f: PaletteFacade | null): void {
  cached = f;
}