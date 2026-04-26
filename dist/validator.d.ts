/**
 * Assumption Registry Protocol (ARP-1.0) — assumption validation
 */
import type { AssumptionEntry, ValidationResult } from './types';
export declare function createValidationResult(assumption_id: string, validated: boolean, method_used: string, evidence: string, validated_at: string): ValidationResult;
export declare function canBeValidated(entry: AssumptionEntry): boolean;
export declare function applyValidation(entry: AssumptionEntry, result: ValidationResult): Pick<AssumptionEntry, 'status' | 'validated_at' | 'invalidated_at' | 'invalidation_reason'>;
//# sourceMappingURL=validator.d.ts.map