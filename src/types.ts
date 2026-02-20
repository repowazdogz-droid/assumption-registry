/**
 * Assumption Registry Protocol (ARP-1.0) — type definitions
 */

export const schema = 'ARP-1.0' as const;

export type AssumptionCategory =
  | 'data_quality'
  | 'world_model'
  | 'user_intent'
  | 'temporal'
  | 'causal'
  | 'distributional'
  | 'ethical'
  | 'operational'
  | 'regulatory'
  | 'domain_specific';

export type AssumptionStatus =
  | 'active'
  | 'validated'
  | 'invalidated'
  | 'expired'
  | 'superseded'
  | 'untested';

export type AssumptionCriticality =
  | 'foundational'
  | 'significant'
  | 'moderate'
  | 'minor';

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
  testable: boolean;
  test_method: string | null;
  domain: string;
  expires_at: string | null;
  dependent_decisions: string[];
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
  by_criticality: Record<AssumptionCriticality, number>;
  untested_foundational: number;
  expired_active: number;
  average_confidence: number;
  most_depended_on: { id: string; dependent_count: number }[];
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
  /** Persisted assumption-to-assumption dependencies for roundtrip */
  assumption_dependencies?: AssumptionDependencyLink[];
}

export interface VerifyResult {
  valid: boolean;
  entries_checked: number;
}

export interface AssumptionFilters {
  category?: AssumptionCategory;
  status?: AssumptionStatus;
  criticality?: AssumptionCriticality;
  domain?: string;
}
