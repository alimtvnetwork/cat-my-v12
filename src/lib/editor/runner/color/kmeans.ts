// Plan 42 step 25. k-means over Lab-space samples with deterministic seeding
// (k-means++ using a mulberry32 PRNG) so the runner and its tests are
// reproducible. Returns clusters sorted by descending member count so
// Dense2/Dense3 can pick the dominant one via clusters[0].

import type { Lab } from "./lab";

export interface Cluster {
  center: Lab;
  count: number;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;

  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);

    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function d2(a: Lab, b: Lab): number {
  const dL = a.L - b.L;
  const da = a.a - b.a;
  const db = a.b - b.b;

  return dL * dL + da * da + db * db;
}

export function kmeansLab(samples: readonly Lab[], k: number, seed = 1, maxIter = 20): Cluster[] {
  if (samples.length === 0 || k <= 0) return [];
  const K = Math.min(k, samples.length);
  const rand = mulberry32(seed);

  // k-means++ init.
  const centers: Lab[] = [samples[Math.floor(rand() * samples.length)]!];
  while (centers.length < K) {
    const dists = samples.map((s) => Math.min(...centers.map((c) => d2(s, c))));
    const total = dists.reduce((a, b) => a + b, 0);

    if (total === 0) {
      centers.push(samples[Math.floor(rand() * samples.length)]!);
      continue;
    }

    let target = rand() * total;
    let idx = 0;
    for (; idx < dists.length; idx++) {
      target -= dists[idx]!;

      if (target <= 0) break;
    }

    centers.push(samples[Math.min(idx, samples.length - 1)]!);
  }

  const assign = new Int32Array(samples.length);
  for (let iter = 0; iter < maxIter; iter++) {
    let hasMoved = false;
    for (let i = 0; i < samples.length; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < K; c++) {
        const dd = d2(samples[i]!, centers[c]!);

        if (dd < bestD) {
          bestD = dd;
          best = c;
        }
      }

      if (assign[i] !== best) {
        assign[i] = best;
        hasMoved = true;
      }
    }

    const sums = Array.from({ length: K }, () => ({ L: 0, a: 0, b: 0, n: 0 }));
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i]!;
      const g = sums[assign[i]!]!;
      g.L += s.L;
      g.a += s.a;
      g.b += s.b;
      g.n += 1;
    }

    for (let c = 0; c < K; c++) {
      const g = sums[c]!;

      if (g.n > 0) centers[c] = { L: g.L / g.n, a: g.a / g.n, b: g.b / g.n };
    }

    if (!hasMoved) break;
  }

  const counts = new Array<number>(K).fill(0);
  for (let i = 0; i < samples.length; i++) counts[assign[i]!] = (counts[assign[i]!] ?? 0) + 1;

  return centers
    .map((center, i) => ({ center, count: counts[i]! }))
    .sort((a, b) => b.count - a.count);
}
