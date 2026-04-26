"use strict";
/**
 * Assumption Registry Protocol (ARP-1.0) — cascade analysis when an assumption fails
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateCascade = simulateCascade;
function simulateCascade(failed_assumption_id, assumptions, dependentsMap, getDependencyMap) {
    const dep = getDependencyMap(failed_assumption_id);
    const byId = new Map(assumptions.map((a) => [a.id, a]));
    const failed = byId.get(failed_assumption_id);
    const isFoundational = failed?.criticality === 'foundational';
    const directly_affected_decisions = [...dep.dependent_decisions];
    const affected_assumptions = new Set(dep.dependent_assumptions);
    const indirectly_affected_decisions = new Set();
    let level = [...dep.dependent_assumptions];
    while (level.length > 0) {
        const next = [];
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
    const totalDecisions = directly_affected_decisions.length + indirectly_affected_decisions.size;
    const total_cascade_size = totalDecisions + affected_assumptions.size;
    let severity = 'contained';
    if (totalDecisions >= 20 || isFoundational) {
        severity = 'systemic';
    }
    else if (totalDecisions >= 5) {
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
