/**
 * Assumption Registry Protocol (ARP-2.0) — cascade analysis when an assumption fails
 */
import type { AssumptionEntry, CascadeReport } from './types';
import type { DependencyMap } from './types';
export declare function simulateCascade(failed_assumption_id: string, assumptions: AssumptionEntry[], dependentsMap: Map<string, string[]>, getDependencyMap: (id: string) => DependencyMap): CascadeReport;
//# sourceMappingURL=cascade-detector.d.ts.map