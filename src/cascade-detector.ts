/**
 * Assumption Registry Protocol (ARP-2.0) — cascade analysis when an assumption fails
 */

import type { AssumptionEntry, CascadeReport, CascadeSeverity } from './types';
import type { DependencyMap } from './types';

export function simulateCascade(
  failed_assumption_id: string,
  assumptions: AssumptionEntry[],
  dependentsMap: Map<string, string[]>,
  getDependencyMap: (id: string) => DependencyMap
): CascadeReport {
  const dep = getDependencyMap(failed_assumption_id);
  const byId = new Map(assumptions.map((a) => [a.id, a]));
  const failed = byId.get(failed_assumption_id);
  const isLoadBearing = failed?.criticality === 'load_bearing';

  const directly_affected_decisions = [...dep.dependent_decisions];
  const affected_assumptions = new Set<string>(dep.dependent_assumptions);
  const indirectly_affected_decisions = new Set<string>();

  let level = [...dep.dependent_assumptions];
  while (level.length > 0) {
    const next: string[] = [];
    for (const aid of level) {
      affected_assumptions.add(aid);
      const a = byId.get(aid);
      if (a) {
        a.dependent_decisions.forEach((d) => indirectly_affected_decisions.add(d));
        const children = dependentsMap.get(aid) ?? [];
        children.forEach((id) => next.push(id));
      }
    }
    level = next;
  }

  const totalDecisions =
    directly_affected_decisions.length + indirectly_affected_decisions.size;
  const total_cascade_size =
    totalDecisions + affected_assumptions.size;

  let severity: CascadeSeverity = 'contained';
  if (totalDecisions >= 20 || isLoadBearing) {
    severity = 'systemic';
  } else if (totalDecisions >= 5) {
    severity = 'significant';
  }

  return {
    failed_assumption_id,
    directly_affected_decisions,
    indirectly_affected_decisions: [...indirectly_affected_decisions],
    affected_assumptions: [...affected_assumptions],
    total_cascade_size,
    severity,
    generated_at: new Date().toISOString(),
  };
}
