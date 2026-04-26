/**
 * Assumption Registry Protocol (ARP-2.0) — main AssumptionRegistry class
 */
import type { AssumptionEntry, AssumptionCriticality, LegacyAssumptionCriticality, TestabilityMetadata, DependencyEdge, DependencyEdgeType, ValidationResult, DependencyMap, CascadeReport, RegistryHealth, RegistrySnapshot, LegacyRegistrySnapshot, VerifyResult, AssumptionFilters, PreActionDecisionContext, PreActionGateReport } from './types';
type RegisterInput = Omit<AssumptionEntry, 'id' | 'timestamp' | 'hash' | 'previous_hash' | 'status' | 'validated_at' | 'invalidated_at' | 'invalidation_reason' | 'superseded_by' | 'dependent_decisions' | 'dependencies'> & {
    dependent_decisions?: string[];
};
type SupersedeInput = Omit<AssumptionEntry, 'id' | 'timestamp' | 'hash' | 'previous_hash' | 'status' | 'validated_at' | 'invalidated_at' | 'invalidation_reason' | 'superseded_by' | 'dependent_decisions' | 'dependencies'>;
type RegisterAdapterInput = Omit<RegisterInput, 'criticality' | 'testability'> & {
    criticality: AssumptionCriticality | LegacyAssumptionCriticality;
    testability?: TestabilityMetadata;
    testable?: boolean;
    test_method?: string | null;
};
type SupersedeAdapterInput = Omit<SupersedeInput, 'criticality' | 'testability'> & {
    criticality: AssumptionCriticality | LegacyAssumptionCriticality;
    testability?: TestabilityMetadata;
    testable?: boolean;
    test_method?: string | null;
};
export declare class AssumptionRegistry {
    readonly system_id: string;
    private assumptions;
    private byId;
    private dependencyEdges;
    /** assumption_id -> list of assumption IDs that depend on it (addAssumptionDependency(dependent_id, this_id)) */
    private dependentsMap;
    constructor(system_id: string);
    private recomputeChainFrom;
    private addEdge;
    private rebuildDependentsMap;
    register(entry: RegisterAdapterInput): AssumptionEntry;
    validate(assumption_id: string, result: Omit<ValidationResult, 'assumption_id' | 'validated_at' | 'new_status'>): ValidationResult;
    invalidate(assumption_id: string, reason: string): AssumptionEntry;
    supersede(assumption_id: string, new_assumption: SupersedeAdapterInput): AssumptionEntry;
    expire(assumption_id: string): AssumptionEntry;
    addDependency(assumption_id: string, clearpath_trace_id: string): void;
    addAssumptionDependency(assumption_id: string, depends_on_id: string, type?: DependencyEdgeType): DependencyEdge;
    addDependencyEdge(edge: Omit<DependencyEdge, 'id' | 'created_at'>): DependencyEdge;
    getDependencyEdges(): DependencyEdge[];
    generatePreActionGateReport(context: PreActionDecisionContext): PreActionGateReport;
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
    static migrateV1Snapshot(snapshot: LegacyRegistrySnapshot): RegistrySnapshot;
}
export {};
//# sourceMappingURL=assumption-registry.d.ts.map