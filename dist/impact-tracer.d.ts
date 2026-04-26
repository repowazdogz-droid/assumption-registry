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
export declare function getDependencyMap(assumptionId: string, assumptions: AssumptionEntry[], dependentsMap: Map<string, string[]>): DependencyMap;
//# sourceMappingURL=impact-tracer.d.ts.map