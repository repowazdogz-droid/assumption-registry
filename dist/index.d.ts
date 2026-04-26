/**
 * Assumption Registry Protocol (ARP-2.0)
 * Explicit assumption declaration, dependency tracking, and cascade analysis.
 * Zero external dependencies (Node.js crypto only).
 */
export { legacySchema, schema } from './types';
export type { AssumptionCategory, AssumptionStatus, AssumptionCriticality, LegacyAssumptionCriticality, TestabilityMetadata, TestabilityStatus, VerificationType, DependencyEdge, DependencyEdgeType, DependencyNodeType, PreActionDecisionContext, GateVerdict, PreActionGateReport, AssumptionEntry, ValidationResult, DependencyMap, CascadeReport, CascadeSeverity, RegistryHealth, RegistrySnapshot, LegacyRegistrySnapshot, AssumptionDependencyLink, VerifyResult, AssumptionFilters, } from './types';
export { AssumptionRegistry } from './assumption-registry';
export { getDependencyMap } from './impact-tracer';
export { simulateCascade } from './cascade-detector';
export { createValidationResult, canBeValidated, applyValidation, } from './validator';
export { sha256, chainHash, generateId, assumptionPayload } from './hash';
//# sourceMappingURL=index.d.ts.map