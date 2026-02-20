/**
 * Assumption Registry Protocol (ARP-1.0)
 * Explicit assumption declaration, dependency tracking, and cascade analysis.
 * Zero external dependencies (Node.js crypto only).
 */

export { schema } from './types';
export type {
  AssumptionCategory,
  AssumptionStatus,
  AssumptionCriticality,
  AssumptionEntry,
  ValidationResult,
  DependencyMap,
  CascadeReport,
  CascadeSeverity,
  RegistryHealth,
  RegistrySnapshot,
  AssumptionDependencyLink,
  VerifyResult,
  AssumptionFilters,
} from './types';

export { AssumptionRegistry } from './assumption-registry';
export { getDependencyMap } from './impact-tracer';
export { simulateCascade } from './cascade-detector';
export {
  createValidationResult,
  canBeValidated,
  applyValidation,
} from './validator';
export { sha256, chainHash, generateId, assumptionPayload } from './hash';
