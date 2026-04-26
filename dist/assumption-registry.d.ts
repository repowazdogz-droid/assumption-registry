/**
 * Assumption Registry Protocol (ARP-1.0) — main AssumptionRegistry class
 */
import type { AssumptionEntry, ValidationResult, DependencyMap, CascadeReport, RegistryHealth, VerifyResult, AssumptionFilters } from './types';
type RegisterInput = Omit<AssumptionEntry, 'id' | 'timestamp' | 'hash' | 'previous_hash' | 'status' | 'validated_at' | 'invalidated_at' | 'invalidation_reason' | 'superseded_by' | 'dependent_decisions'> & {
    dependent_decisions?: string[];
};
type SupersedeInput = Omit<AssumptionEntry, 'id' | 'timestamp' | 'hash' | 'previous_hash' | 'status' | 'validated_at' | 'invalidated_at' | 'invalidation_reason' | 'superseded_by' | 'dependent_decisions'>;
export declare class AssumptionRegistry {
    readonly system_id: string;
    private assumptions;
    private byId;
    /** assumption_id -> list of assumption IDs that depend on it (addAssumptionDependency(dependent_id, this_id)) */
    private dependentsMap;
    constructor(system_id: string);
    private recomputeChainFrom;
    register(entry: RegisterInput): AssumptionEntry;
    validate(assumption_id: string, result: Omit<ValidationResult, 'assumption_id' | 'validated_at' | 'new_status'>): ValidationResult;
    invalidate(assumption_id: string, reason: string): AssumptionEntry;
    supersede(assumption_id: string, new_assumption: SupersedeInput): AssumptionEntry;
    expire(assumption_id: string): AssumptionEntry;
    addDependency(assumption_id: string, clearpath_trace_id: string): void;
    addAssumptionDependency(assumption_id: string, depends_on_id: string): void;
    getDependencyMap(assumption_id: string): DependencyMap;
    simulateCascade(assumption_id: string): CascadeReport;
    getVulnerabilities(): DependencyMap[];
    getHealth(): RegistryHealth;
    getExpired(): AssumptionEntry[];
    getUntestedFoundational(): AssumptionEntry[];
    getAssumptions(filters?: AssumptionFilters): AssumptionEntry[];
    getByDecision(clearpath_trace_id: string): AssumptionEntry[];
    verify(): VerifyResult;
    toJSON(): string;
    toMarkdown(): string;
    static fromJSON(json: string): AssumptionRegistry;
}
export {};
//# sourceMappingURL=assumption-registry.d.ts.map