"use strict";
/**
 * Assumption Registry Protocol (ARP-1.0) — hashing and ID generation
 * Uses Node.js crypto only (zero external dependencies).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = sha256;
exports.chainHash = chainHash;
exports.generateId = generateId;
exports.assumptionPayload = assumptionPayload;
const crypto_1 = require("crypto");
const HASH_ALGORITHM = 'sha256';
const ID_BYTES = 16;
function sha256(data) {
    return (0, crypto_1.createHash)(HASH_ALGORITHM).update(data, 'utf8').digest('hex');
}
function chainHash(previousHash, payload) {
    return sha256(previousHash + payload);
}
function generateId() {
    return (0, crypto_1.randomBytes)(ID_BYTES).toString('hex');
}
function sortedJoin(arr) {
    return [...arr].sort().join('|');
}
function assumptionPayload(entry) {
    return [
        entry.id,
        entry.timestamp,
        entry.agent_id,
        entry.category,
        entry.statement,
        entry.basis,
        entry.criticality,
        entry.status,
        String(entry.confidence),
        String(entry.testable),
        entry.test_method ?? '',
        entry.domain,
        entry.expires_at ?? '',
        sortedJoin(entry.dependent_decisions),
        entry.superseded_by ?? '',
        entry.validated_at ?? '',
        entry.invalidated_at ?? '',
        entry.invalidation_reason ?? '',
    ].join('\n');
}
