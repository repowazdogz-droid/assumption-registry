/**
 * Assumption Registry Protocol (ARP-2.0) — type definitions
 */
export declare const schema: "ARP-2.0";
export declare const legacySchema: "ARP-1.0";
export type AssumptionCategory = 'data_quality' | 'world_model' | 'user_intent' | 'temporal' | 'causal' | 'distributional' | 'ethical' | 'operational' | 'regulatory' | 'domain_specific';
export type AssumptionStatus = 'active' | 'validated' | 'invalidated' | 'expired' | 'superseded' | 'untested';
export type AssumptionCriticality = 'load_bearing' | 'peripheral';
export type LegacyAssumptionCriticality = 'foundational' | 'significant' | 'moderate' | 'minor';
export type TestabilityStatus = 'testable' | 'partially_testable' | 'not_testable';
export type VerificationType = 'external_source_check' | 'runtime_telemetry' | 'formal_validator' | 'stress_test' | 'human_review' | 'cross_model_consistency' | 'not_available';
export interface TestabilityMetadata {
    status: TestabilityStatus;
    verification_type: VerificationType;
    method: string | null;
    acceptance_criteria: string | null;
    evidence_required: string[];
    last_tested_at: string | null;
    next_test_due_at: string | null;
    verifier: string | null;
}
export type DependencyNodeType = 'assumption' | 'decision' | 'evidence' | 'protocol_record' | 'external_source';
export type DependencyEdgeType = 'derives_from' | 'constrains' | 'refines' | 'contradicts';
export interface DependencyEdge {
    id: string;
    from_id: string;
    from_type: DependencyNodeType;
    type: DependencyEdgeType;
    to_id: string;
    to_type: DependencyNodeType;
    required_for_gate: boolean;
    created_at: string;
}
export interface PreActionDecisionContext {
    action_id: string;
    assumption_ids?: string[];
    decision_ids?: string[];
}
export type GateVerdict = 'pass' | 'warn' | 'block';
export interface PreActionGateReport {
    action_id: string;
    generated_at: string;
    verdict: GateVerdict;
    load_bearing_assumptions: string[];
    unverified_load_bearing_assumptions: string[];
    expired_load_bearing_assumptions: string[];
    dependency_gaps: string[];
}
export interface AssumptionEntry {
    id: string;
    timestamp: string;
    agent_id: string;
    category: AssumptionCategory;
    statement: string;
    basis: string;
    criticality: AssumptionCriticality;
    status: AssumptionStatus;
    confidence: number;
    testability?: TestabilityMetadata;
    /**
     * Deprecated ARP-1.0 adapter fields. New ARP-2.0 callers should use testability.
     */
    testable?: boolean;
    test_method?: string | null;
    domain: string;
    expires_at: string | null;
    dependent_decisions: string[];
    dependencies: string[];
    superseded_by: string | null;
    validated_at: string | null;
    invalidated_at: string | null;
    invalidation_reason: string | null;
    hash: string;
    previous_hash: string;
}
export interface ValidationResult {
    assumption_id: string;
    validated: boolean;
    method_used: string;
    evidence: string;
    validated_at: string;
    new_status: AssumptionStatus;
}
export interface DependencyMap {
    assumption_id: string;
    dependent_decisions: string[];
    dependent_assumptions: string[];
    cascade_depth: number;
    total_affected: number;
}
export type CascadeSeverity = 'contained' | 'significant' | 'systemic';
export interface CascadeReport {
    failed_assumption_id: string;
    directly_affected_decisions: string[];
    indirectly_affected_decisions: string[];
    affected_assumptions: string[];
    total_cascade_size: number;
    severity: CascadeSeverity;
    generated_at: string;
}
export interface RegistryHealth {
    total_assumptions: number;
    by_status: Record<AssumptionStatus, number>;
    by_criticality: Record<AssumptionCriticality | LegacyAssumptionCriticality, number>;
    untested_foundational: number;
    unverified_load_bearing: number;
    expired_load_bearing: number;
    unresolved_dependency_gaps: number;
    expired_active: number;
    average_confidence: number;
    most_depended_on: {
        id: string;
        dependent_count: number;
    }[];
    generated_at: string;
}
export interface AssumptionDependencyLink {
    assumption_id: string;
    depends_on_id: string;
}
export interface RegistrySnapshot {
    schema: typeof schema;
    system_id: string;
    assumptions: AssumptionEntry[];
    dependency_edges: DependencyEdge[];
}
export interface LegacyRegistrySnapshot {
    schema: typeof legacySchema;
    system_id: string;
    assumptions: Array<Omit<AssumptionEntry, 'criticality' | 'dependencies' | 'testability'> & {
        criticality: LegacyAssumptionCriticality;
        testable: boolean;
        test_method: string | null;
    }>;
    assumption_dependencies?: AssumptionDependencyLink[];
}
export interface VerifyResult {
    valid: boolean;
    entries_checked: number;
}
export interface AssumptionFilters {
    category?: AssumptionCategory;
    status?: AssumptionStatus;
    criticality?: AssumptionCriticality | LegacyAssumptionCriticality;
    domain?: string;
}
//# sourceMappingURL=types.d.ts.map