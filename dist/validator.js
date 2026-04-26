"use strict";
/**
 * Assumption Registry Protocol (ARP-2.0) — assumption validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createValidationResult = createValidationResult;
exports.canBeValidated = canBeValidated;
exports.applyValidation = applyValidation;
function createValidationResult(assumption_id, validated, method_used, evidence, validated_at) {
    const new_status = validated ? 'validated' : 'invalidated';
    return {
        assumption_id,
        validated,
        method_used,
        evidence,
        validated_at,
        new_status,
    };
}
function canBeValidated(entry) {
    if (entry.status === 'invalidated')
        return false;
    if (entry.status === 'superseded')
        return false;
    if (entry.status === 'expired')
        return false;
    return true;
}
function applyValidation(entry, result) {
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
