/**
 * Assumption Registry Protocol (ARP-2.0) — assumption validation
 */

import type { AssumptionEntry, ValidationResult, AssumptionStatus } from './types';

export function createValidationResult(
  assumption_id: string,
  validated: boolean,
  method_used: string,
  evidence: string,
  validated_at: string
): ValidationResult {
  const new_status: AssumptionStatus = validated ? 'validated' : 'invalidated';
  return {
    assumption_id,
    validated,
    method_used,
    evidence,
    validated_at,
    new_status,
  };
}

export function canBeValidated(entry: AssumptionEntry): boolean {
  if (entry.status === 'invalidated') return false;
  if (entry.status === 'superseded') return false;
  if (entry.status === 'expired') return false;
  return true;
}

export function applyValidation(
  entry: AssumptionEntry,
  result: ValidationResult
): Pick<AssumptionEntry, 'status' | 'validated_at' | 'invalidated_at' | 'invalidation_reason'> {
  if (result.validated) {
    return {
      status: 'validated',
      validated_at: result.validated_at,
      invalidated_at: null,
      invalidation_reason: null,
    };
  }
  return {
    status: 'invalidated',
    validated_at: null,
    invalidated_at: result.validated_at,
    invalidation_reason: result.evidence || result.method_used,
  };
}
