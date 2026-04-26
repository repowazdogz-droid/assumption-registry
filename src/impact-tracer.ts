/**
 * Assumption Registry Protocol (ARP-2.0) — dependency graph and impact tracing
 *
 * For assumption A, "dependent assumptions" = assumptions that depend on A
 * (i.e. addAssumptionDependency(their_id, A) was called).
 */

import type { AssumptionEntry, DependencyMap } from './types';

/**
 * Returns list of assumption IDs that directly depend on the given assumption.
 * dependentsMap: assumption_id -> list of assumption IDs that depend on it.
 */
export function getDependencyMap(
  assumptionId: string,
  assumptions: AssumptionEntry[],
  dependentsMap: Map<string, string[]>
): DependencyMap {
  const entry = assumptions.find((a) => a.id === assumptionId);
  const dependent_decisions = entry ? [...entry.dependent_decisions] : [];
  const dependent_assumptions = dependentsMap.get(assumptionId) ?? [];

  const byId = new Map(assumptions.map((a) => [a.id, a]));
  const allAffectedDecisions = new Set<string>(dependent_decisions);
  const allAffectedAssumptionIds = new Set<string>(dependent_assumptions);
  let depth = 0;
  let currentLevel = [...dependent_assumptions];

  while (currentLevel.length > 0) {
    depth += 1;
    const nextLevel: string[] = [];
    for (const aid of currentLevel) {
      allAffectedAssumptionIds.add(aid);
      const a = byId.get(aid);
      if (a) {
        a.dependent_decisions.forEach((d) => allAffectedDecisions.add(d));
        const children = dependentsMap.get(aid) ?? [];
        children.forEach((id) => nextLevel.push(id));
      }
    }
    currentLevel = nextLevel;
  }

  return {
    assumption_id: assumptionId,
    dependent_decisions,
    dependent_assumptions,
    cascade_depth: depth,
    total_affected: allAffectedDecisions.size + allAffectedAssumptionIds.size,
  };
}
