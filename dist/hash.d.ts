/**
 * Assumption Registry Protocol (ARP-1.0) — hashing and ID generation
 * Uses Node.js crypto only (zero external dependencies).
 */
import type { AssumptionEntry } from './types';
export declare function sha256(data: string): string;
export declare function chainHash(previousHash: string, payload: string): string;
export declare function generateId(): string;
export declare function assumptionPayload(entry: AssumptionEntry): string;
//# sourceMappingURL=hash.d.ts.map