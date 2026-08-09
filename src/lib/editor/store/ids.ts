// Deterministic id generator seam (G-STORE-03: reducers stay pure, callers
// inject ids). Runtime uses a monotonic counter; tests reset it.
let counter = 0;
const PREFIX = "r-";
let conditionCounter = 0;
const CONDITION_PREFIX = "c-";

export function nextRuleId(): string {
  counter += 1;

  return `${PREFIX}${counter.toString(36)}`;
}

export function nextRuleIds(n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i += 1) out.push(nextRuleId());

  return out;
}

// Plan 42 step 18. Condition id generator seam used by the conditions editor
// when the user adds a new condition. Distinct namespace from rule ids so
// the two never collide in logs or tests.
export function nextConditionId(): string {
  conditionCounter += 1;

  return `${CONDITION_PREFIX}${conditionCounter.toString(36)}`;
}

export function __resetIdsForTests(): void {
  counter = 0;
  conditionCounter = 0;
}
