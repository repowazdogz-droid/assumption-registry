/**
 * Assumption Registry Protocol (ARP-2.0) — hashing and ID generation
 * Uses Node.js crypto only (zero external dependencies).
 */

import { createHash, randomBytes } from 'crypto';
import type { AssumptionEntry } from './types';

const HASH_ALGORITHM = 'sha256';
const ID_BYTES = 16;

export function sha256(data: string): string {
  return createHash(HASH_ALGORITHM).update(data, 'utf8').digest('hex');
}

export function chainHash(previousHash: string, payload: string): string {
  return sha256(previousHash + payload);
}

export function generateId(): string {
  return randomBytes(ID_BYTES).toString('hex');
}

function sortedJoin(arr: string[]): string {
  return [...arr].sort().join('|');
}

export function assumptionPayload(entry: AssumptionEntry): string {
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
    JSON.stringify(entry.testability ?? null),
    entry.domain,
    entry.expires_at ?? '',
    sortedJoin(entry.dependent_decisions),
    sortedJoin(entry.dependencies),
    entry.superseded_by ?? '',
    entry.validated_at ?? '',
    entry.invalidated_at ?? '',
    entry.invalidation_reason ?? '',
  ].join('\n');
}
