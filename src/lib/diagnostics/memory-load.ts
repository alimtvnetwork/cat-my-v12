// Diagnostics: load .lovable memory + plans at build time via Vite glob.
// Client-safe. Returns a structured status the /diagnostics page renders.

export interface MemoryFileEntry {
  path: string;
  name: string;
  bytes: number;
  preview: string;
}

export interface MemoryLoadResult {
  ok: boolean;
  loadedAt: string;
  memoryFiles: MemoryFileEntry[];
  pendingPlanIds: string[];
  donePlanIds: string[];
  specOverviewPaths: string[];
  errors: string[];
}

function toEntry(path: string, raw: unknown): MemoryFileEntry | string {
  if (typeof raw !== "string") return `Non-string content at ${path}`;
  const name = path.split("/").pop() ?? path;

  return { path, name, bytes: raw.length, preview: raw.slice(0, 200) };
}

function idsFrom(record: Record<string, unknown>): string[] {
  return Object.keys(record)
    .map((p) => p.split("/").pop() ?? p)
    .map((n) => n.replace(/\.md$/, ""))
    .sort();
}

export function loadMemoryDiagnostics(): MemoryLoadResult {
  const errors: string[] = [];
  const memoryFiles: MemoryFileEntry[] = [];
  try {
    const mem = import.meta.glob("/.lovable/memory/*.md", {
      eager: true,
      query: "?raw",
      import: "default",
    }) as Record<string, unknown>;
    for (const [p, raw] of Object.entries(mem)) {
      const e = toEntry(p, raw);

      if (typeof e === "string") errors.push(e);
      else memoryFiles.push(e);
    }

    if (memoryFiles.length === 0) errors.push("No memory files matched .lovable/memory/*.md");
  } catch (err) {
    errors.push(`memory glob failed: ${(err as Error).message}`);
  }

  const pending = safeGlob(
    import.meta.glob("/.lovable/plans/pending/*.md", {
      eager: true,
      query: "?raw",
      import: "default",
    }) as Record<string, unknown>,
    errors,
  );
  const done = safeGlob(
    import.meta.glob("/.lovable/plans/done/*.md", {
      eager: true,
      query: "?raw",
      import: "default",
    }) as Record<string, unknown>,
    errors,
  );
  const spec = safeGlob(
    import.meta.glob("/spec/**/00-overview.md", {
      eager: true,
      query: "?raw",
      import: "default",
    }) as Record<string, unknown>,
    errors,
  );
  memoryFiles.sort((a, b) => a.name.localeCompare(b.name));

  return {
    ok: errors.length === 0 && memoryFiles.length > 0,
    loadedAt: new Date().toISOString(),
    memoryFiles,
    pendingPlanIds: idsFrom(pending),
    donePlanIds: idsFrom(done),
    specOverviewPaths: Object.keys(spec).sort(),
    errors,
  };
}

function safeGlob(result: Record<string, unknown>, errors: string[]): Record<string, unknown> {
  // Static analysis handles the glob, we just return the result (or log errors if it somehow throws, though eager globs throw at build time).
  return result || {};
}