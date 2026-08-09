// Lightweight subsequence fuzzy matcher used by the command palette.
//
// Returns a score plus the positions of every query char inside the
// target string so callers can highlight the matched glyphs. Higher
// score means a better match. Returns `null` when the query cannot be
// matched as a subsequence.
//
// Scoring heuristics (all case-insensitive):
// - +8 if the char sits at a word boundary (start of string or after
//   space, dash, comma, slash, dot, underscore).
// - +4 if the char matches the case of the target exactly.
// - +6 for each consecutive pair of matched chars.
// - -1 per skipped target char between matches (proximity bonus).
// - +20 flat if the query is a case-insensitive prefix of the target
//   (keeps typing "res" ahead of "reset" over "results").

export interface FuzzyMatch {
  score: number;
  /** Indices in the target string of each matched query character. */
  indices: number[];
}

const BOUNDARY_CHARS = new Set([" ", "-", "_", ".", "/", ",", ":"]);

function isBoundary(target: string, i: number): boolean {
  if (i === 0) return true;

  return BOUNDARY_CHARS.has(target[i - 1] ?? "");
}

export function fuzzyMatch(query: string, target: string): FuzzyMatch | null {
  if (!query) return { score: 0, indices: [] };

  if (!target) return null;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  const indices: number[] = [];
  let ti = 0;
  let score = 0;
  let prevMatch = -2;
  for (let qi = 0; qi < q.length; qi++) {
    const qc = q[qi];
    let found = -1;
    while (ti < t.length) {
      if (t[ti] === qc) {
        found = ti;
        break;
      }

      ti++;
    }

    if (found === -1) return null;
    let gain = 1;

    if (isBoundary(target, found)) gain += 8;

    if (target[found] === query[qi]) gain += 4;

    if (prevMatch === found - 1) gain += 6;
    else if (prevMatch >= 0) gain -= Math.min(found - prevMatch - 1, 5);
    score += gain;
    indices.push(found);
    prevMatch = found;
    ti = found + 1;
  }

  if (t.startsWith(q)) score += 20;

  return { score, indices };
}

/**
 * Split a target string into runs marked as matched/unmatched using the
 * indices returned by `fuzzyMatch`. Useful for highlighting.
 */
export interface HighlightRun {
  text: string;
  matched: boolean;
}

export function highlightRuns(target: string, indices: readonly number[]): HighlightRun[] {
  if (indices.length === 0) return [{ text: target, matched: false }];
  const set = new Set(indices);
  const runs: HighlightRun[] = [];
  let buf = "";
  let bufMatched = set.has(0);
  for (let i = 0; i < target.length; i++) {
    const m = set.has(i);

    if (m === bufMatched) {
      buf += target[i];
    } else {
      if (buf) runs.push({ text: buf, matched: bufMatched });
      buf = target[i];
      bufMatched = m;
    }
  }

  if (buf) runs.push({ text: buf, matched: bufMatched });

  return runs;
}
