import type { EditorRule } from "@/lib/editor/types";
import { ValidationStatusType, type ValidationResult } from "@/lib/editor/validation-store";
import type {
  DAGExecutionOrderResult,
  DAGRuleExecutionDecision,
} from "@/domain/execution/math-rule-types";

export function extractRuleDependencies(rule: EditorRule): {
  parentIds: string[];
  skipIfParentFailed: boolean;
} {
  const params = (rule.params as Record<string, unknown> | undefined) ?? {};
  const parentIds: string[] = [];

  if (typeof params.dependsOnRuleId === "string" && params.dependsOnRuleId.trim()) {
    parentIds.push(params.dependsOnRuleId.trim());
  }

  if (typeof params.gatingParentRuleId === "string" && params.gatingParentRuleId.trim()) {
    parentIds.push(params.gatingParentRuleId.trim());
  }

  if (Array.isArray(params.dependencies)) {
    for (const dep of params.dependencies) {
      if (typeof dep === "string" && dep.trim() && !parentIds.includes(dep.trim())) {
        parentIds.push(dep.trim());
      }
    }
  }

  const skipIfParentFailed =
    typeof params.skipIfParentFailed === "boolean" ? params.skipIfParentFailed : true;

  return {
    parentIds,
    skipIfParentFailed,
  };
}

export function buildRuleDAG(rules: readonly EditorRule[]): DAGExecutionOrderResult {
  const ruleMap = new Map<string, EditorRule>();
  const inDegree = new Map<string, number>();
  const adjacencyList = new Map<string, string[]>();
  const dependencyMap: Record<string, string[]> = {};

  for (const rule of rules) {
    ruleMap.set(rule.id, rule);
    inDegree.set(rule.id, 0);
    adjacencyList.set(rule.id, []);
    dependencyMap[rule.id] = [];
  }

  // Build forward graph (parent -> child) and resolve appliesBefore (predecessor -> successor)
  for (const rule of rules) {
    const { parentIds } = extractRuleDependencies(rule);

    for (const pId of parentIds) {
      if (ruleMap.has(pId)) {
        adjacencyList.get(pId)?.push(rule.id);
        inDegree.set(rule.id, (inDegree.get(rule.id) ?? 0) + 1);
        dependencyMap[rule.id].push(pId);
      }
    }

    // Check appliesBefore in rule params: if rule A has appliesBefore: [B], then B depends on A
    const params = (rule.params as Record<string, unknown> | undefined) ?? {};

    if (Array.isArray(params.appliesBefore)) {
      for (const targetId of params.appliesBefore) {
        if (typeof targetId === "string" && ruleMap.has(targetId)) {
          adjacencyList.get(rule.id)?.push(targetId);
          inDegree.set(targetId, (inDegree.get(targetId) ?? 0) + 1);

          if (!dependencyMap[targetId].includes(rule.id)) {
            dependencyMap[targetId].push(rule.id);
          }
        }
      }
    }
  }

  // Kahn's algorithm for topological sorting
  const queue: string[] = [];

  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) {
      queue.push(id);
    }
  }

  const orderedRuleIds: string[] = [];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    orderedRuleIds.push(currentId);

    const neighbors = adjacencyList.get(currentId) ?? [];

    for (const neighborId of neighbors) {
      const updatedDegree = (inDegree.get(neighborId) ?? 1) - 1;
      inDegree.set(neighborId, updatedDegree);

      if (updatedDegree === 0) {
        queue.push(neighborId);
      }
    }
  }

  const hasCycle = orderedRuleIds.length < rules.length;
  let cycleNodeIds: string[] | undefined;

  if (hasCycle) {
    cycleNodeIds = rules.filter((r) => !orderedRuleIds.includes(r.id)).map((r) => r.id);

    // Deliberately NOT appended to orderedRuleIds: a cycle node (or a node
    // blocked downstream of one) has no valid execution position, so
    // presenting it in order would silently execute it as if valid.
    // Callers must handle cycleNodeIds explicitly — fail the set with
    // assertAcyclicDAG / getCycleErrorMessage, or skip the nodes with
    // createCycleSkippedValidationResult. executeDAGRules below does the
    // latter so cyclic rules still appear in results as Skipped.
  }

  return {
    hasCycle,
    orderedRuleIds,
    cycleNodeIds,
    dependencyMap,
  };
}

/**
 * Clear, caller-usable cycle message, or null when the DAG is acyclic.
 * Returns null (not a message) when hasCycle is false even if a stale
 * cycleNodeIds list is present, so callers can gate on this alone.
 */
export function getCycleErrorMessage(dag: DAGExecutionOrderResult): string | null {
  if (!dag.hasCycle || !dag.cycleNodeIds || dag.cycleNodeIds.length === 0) {
    return null;
  }

  return (
    `Dependency cycle detected: rule(s) ${dag.cycleNodeIds.join(", ")} ` +
    `could not be topologically ordered (in a cycle, or blocked downstream of one). ` +
    `Cyclic rules were excluded from the execution order and must be skipped or failed, not executed.`
  );
}

/**
 * Fail-fast guard for callers that must not run a cyclic rule set at all.
 * Throws an Error carrying getCycleErrorMessage(dag); no-op when acyclic.
 */
export function assertAcyclicDAG(dag: DAGExecutionOrderResult): void {
  const message = getCycleErrorMessage(dag);

  if (message) {
    throw new Error(message);
  }
}

/**
 * Skip-path counterpart to createSkippedValidationResult, for rules
 * excluded from orderedRuleIds because of a cycle. Use it to materialize
 * a result for every cycleNodeId instead of silently dropping the rule
 * (or, worse, executing it in an arbitrary order).
 */
export function createCycleSkippedValidationResult(params: {
  rule: EditorRule;
  cycleNodeIds?: string[];
}): ValidationResult {
  const cycleList = params.cycleNodeIds ?? [];
  const cycleText = cycleList.length > 0 ? cycleList.join(", ") : params.rule.id;

  return {
    status: ValidationStatusType.Skipped,
    score: 0.0,
    message:
      `Rule "${params.rule.name}" skipped: dependency cycle involving ${cycleText} — ` +
      `the rule was excluded from the execution order and was not executed.`,
    stub: false,
    debug: {
      isSkipped: true,
      isCycleSkipped: true,
      cycleNodeIds: cycleList,
      ruleId: params.rule.id,
      ruleName: params.rule.name,
    },
  };
}

export function evaluateRuleGatingDecision(params: {
  rule: EditorRule;
  previousResults: Record<string, ValidationResult>;
  allRulesMap?: Map<string, EditorRule>;
}): DAGRuleExecutionDecision {
  const { rule, previousResults, allRulesMap } = params;
  const { parentIds, skipIfParentFailed } = extractRuleDependencies(rule);

  if (parentIds.length === 0 || !skipIfParentFailed) {
    return {
      ruleId: rule.id,
      isExecutable: true,
      isSkipped: false,
    };
  }

  for (const parentId of parentIds) {
    const parentRes = previousResults[parentId];
    const parentRuleName = allRulesMap?.get(parentId)?.name ?? parentId;

    if (!parentRes) {
      return {
        ruleId: rule.id,
        isExecutable: false,
        isSkipped: true,
        blockingParentRuleId: parentId,
        skipReason: `Skipped: upstream parent rule "${parentRuleName}" has not executed.`,
      };
    }

    if (
      parentRes.status === ValidationStatusType.Fail ||
      parentRes.status === ValidationStatusType.Skipped
    ) {
      return {
        ruleId: rule.id,
        isExecutable: false,
        isSkipped: true,
        blockingParentRuleId: parentId,
        skipReason: `Skipped: upstream gating rule "${parentRuleName}" ${parentRes.status === ValidationStatusType.Skipped ? "was skipped" : "FAILED"}.`,
      };
    }
  }

  return {
    ruleId: rule.id,
    isExecutable: true,
    isSkipped: false,
  };
}

export function createSkippedValidationResult(params: {
  rule: EditorRule;
  decision: DAGRuleExecutionDecision;
}): ValidationResult {
  return {
    status: ValidationStatusType.Skipped,
    score: 0.0,
    message: params.decision.skipReason ?? `Rule "${params.rule.name}" skipped by upstream gate.`,
    stub: false,
    debug: {
      isSkipped: true,
      blockingParentRuleId: params.decision.blockingParentRuleId,
      ruleId: params.rule.id,
      ruleName: params.rule.name,
    },
  };
}

export async function executeDAGRules(params: {
  rules: readonly EditorRule[];
  executeRule: (
    rule: EditorRule,
    accumulatedResults: Record<string, ValidationResult>,
  ) => Promise<ValidationResult> | ValidationResult;
  onRuleCompleted?: (rule: EditorRule, result: ValidationResult) => void;
}): Promise<Record<string, ValidationResult>> {
  const { rules, executeRule, onRuleCompleted } = params;
  const dag = buildRuleDAG(rules);
  const ruleMap = new Map<string, EditorRule>(rules.map((r) => [r.id, r]));
  const accumulatedResults: Record<string, ValidationResult> = {};

  for (const ruleId of dag.orderedRuleIds) {
    const rule = ruleMap.get(ruleId);

    if (!rule) {
      continue;
    }

    const decision = evaluateRuleGatingDecision({
      rule,
      previousResults: accumulatedResults,
      allRulesMap: ruleMap,
    });

    let result: ValidationResult;

    if (decision.isSkipped) {
      result = createSkippedValidationResult({ rule, decision });
    } else {
      result = await executeRule(rule, accumulatedResults);
    }

    accumulatedResults[rule.id] = result;

    if (onRuleCompleted) {
      onRuleCompleted(rule, result);
    }
  }

  // Cycle nodes are no longer in orderedRuleIds, so give them an explicit
  // Skipped result (with a cycle message) rather than dropping them from
  // the result map or executing them in an arbitrary order.
  if (dag.hasCycle && dag.cycleNodeIds) {
    for (const ruleId of dag.cycleNodeIds) {
      const rule = ruleMap.get(ruleId);

      if (!rule || ruleId in accumulatedResults) {
        continue;
      }

      const result = createCycleSkippedValidationResult({
        rule,
        cycleNodeIds: dag.cycleNodeIds,
      });

      accumulatedResults[rule.id] = result;

      if (onRuleCompleted) {
        onRuleCompleted(rule, result);
      }
    }
  }

  return accumulatedResults;
}
