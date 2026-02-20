/**
 * Assumption Registry Protocol (ARP-1.0) — main AssumptionRegistry class
 */

import type {
  AssumptionEntry,
  AssumptionStatus,
  AssumptionCategory,
  AssumptionCriticality,
  ValidationResult,
  DependencyMap,
  CascadeReport,
  RegistryHealth,
  RegistrySnapshot,
  VerifyResult,
  AssumptionFilters,
} from './types';
import { schema } from './types';
import { generateId, chainHash, assumptionPayload } from './hash';
import { createValidationResult, canBeValidated, applyValidation } from './validator';
import { getDependencyMap } from './impact-tracer';
import { simulateCascade } from './cascade-detector';

const GENESIS = '0';

type RegisterInput = Omit<
  AssumptionEntry,
  | 'id'
  | 'timestamp'
  | 'hash'
  | 'previous_hash'
  | 'status'
  | 'validated_at'
  | 'invalidated_at'
  | 'invalidation_reason'
  | 'superseded_by'
  | 'dependent_decisions'
> & { dependent_decisions?: string[] };

type SupersedeInput = Omit<
  AssumptionEntry,
  | 'id'
  | 'timestamp'
  | 'hash'
  | 'previous_hash'
  | 'status'
  | 'validated_at'
  | 'invalidated_at'
  | 'invalidation_reason'
  | 'superseded_by'
  | 'dependent_decisions'
>;

export class AssumptionRegistry {
  readonly system_id: string;
  private assumptions: AssumptionEntry[] = [];
  private byId: Map<string, AssumptionEntry> = new Map();
  /** assumption_id -> list of assumption IDs that depend on it (addAssumptionDependency(dependent_id, this_id)) */
  private dependentsMap: Map<string, string[]> = new Map();

  constructor(system_id: string) {
    this.system_id = system_id;
  }

  private recomputeChainFrom(index: number): void {
    const prev = index === 0 ? GENESIS : this.assumptions[index - 1].hash;
    for (let i = index; i < this.assumptions.length; i++) {
      const e = this.assumptions[i];
      e.previous_hash = i === 0 ? GENESIS : this.assumptions[i - 1].hash;
      e.hash = chainHash(e.previous_hash, assumptionPayload(e));
    }
  }

  register(entry: RegisterInput): AssumptionEntry {
    const id = generateId();
    const timestamp = new Date().toISOString();
    const status: AssumptionStatus = entry.testable ? 'untested' : 'active';
    const previous_hash =
      this.assumptions.length === 0
        ? GENESIS
        : this.assumptions[this.assumptions.length - 1].hash;
    const full: AssumptionEntry = {
      ...entry,
      id,
      timestamp,
      status,
      dependent_decisions: entry.dependent_decisions ?? [],
      superseded_by: null,
      validated_at: null,
      invalidated_at: null,
      invalidation_reason: null,
      previous_hash,
      hash: '',
    };
    full.hash = chainHash(previous_hash, assumptionPayload(full));
    this.assumptions.push(full);
    this.byId.set(id, full);
    return full;
  }

  validate(
    assumption_id: string,
    result: Omit<ValidationResult, 'assumption_id' | 'validated_at' | 'new_status'>
  ): ValidationResult {
    const entry = this.byId.get(assumption_id);
    if (!entry) throw new Error(`Assumption not found: ${assumption_id}`);
    if (!canBeValidated(entry)) throw new Error(`Assumption cannot be validated: ${assumption_id}`);
    const validated_at = new Date().toISOString();
    const fullResult = createValidationResult(
      assumption_id,
      result.validated,
      result.method_used,
      result.evidence,
      validated_at
    );
    const updates = applyValidation(entry, fullResult);
    Object.assign(entry, updates);
    const idx = this.assumptions.findIndex((a) => a.id === assumption_id);
    this.recomputeChainFrom(idx);
    return fullResult;
  }

  invalidate(assumption_id: string, reason: string): AssumptionEntry {
    const entry = this.byId.get(assumption_id);
    if (!entry) throw new Error(`Assumption not found: ${assumption_id}`);
    const invalidated_at = new Date().toISOString();
    entry.status = 'invalidated';
    entry.validated_at = null;
    entry.invalidated_at = invalidated_at;
    entry.invalidation_reason = reason;
    const idx = this.assumptions.findIndex((a) => a.id === assumption_id);
    this.recomputeChainFrom(idx);
    return entry;
  }

  supersede(assumption_id: string, new_assumption: SupersedeInput): AssumptionEntry {
    const old = this.byId.get(assumption_id);
    if (!old) throw new Error(`Assumption not found: ${assumption_id}`);
    const created = this.register({
      ...new_assumption,
      dependent_decisions: [],
    });
    old.status = 'superseded';
    old.superseded_by = created.id;
    const idx = this.assumptions.findIndex((a) => a.id === assumption_id);
    this.recomputeChainFrom(idx);
    return created;
  }

  expire(assumption_id: string): AssumptionEntry {
    const entry = this.byId.get(assumption_id);
    if (!entry) throw new Error(`Assumption not found: ${assumption_id}`);
    entry.status = 'expired';
    const idx = this.assumptions.findIndex((a) => a.id === assumption_id);
    this.recomputeChainFrom(idx);
    return entry;
  }

  addDependency(assumption_id: string, clearpath_trace_id: string): void {
    const entry = this.byId.get(assumption_id);
    if (!entry) throw new Error(`Assumption not found: ${assumption_id}`);
    if (!entry.dependent_decisions.includes(clearpath_trace_id)) {
      entry.dependent_decisions.push(clearpath_trace_id);
      const idx = this.assumptions.findIndex((a) => a.id === assumption_id);
      this.recomputeChainFrom(idx);
    }
  }

  addAssumptionDependency(assumption_id: string, depends_on_id: string): void {
    if (!this.byId.has(assumption_id)) throw new Error(`Assumption not found: ${assumption_id}`);
    if (!this.byId.has(depends_on_id)) throw new Error(`Assumption not found: ${depends_on_id}`);
    const list = this.dependentsMap.get(depends_on_id) ?? [];
    if (!list.includes(assumption_id)) {
      list.push(assumption_id);
      this.dependentsMap.set(depends_on_id, list);
    }
  }

  getDependencyMap(assumption_id: string): DependencyMap {
    return getDependencyMap(assumption_id, this.assumptions, this.dependentsMap);
  }

  simulateCascade(assumption_id: string): CascadeReport {
    return simulateCascade(
      assumption_id,
      this.assumptions,
      this.dependentsMap,
      (id) => this.getDependencyMap(id)
    );
  }

  getVulnerabilities(): DependencyMap[] {
    const maps = this.assumptions.map((a) => this.getDependencyMap(a.id));
    return maps.sort((a, b) => b.total_affected - a.total_affected);
  }

  getHealth(): RegistryHealth {
    const by_status: Record<AssumptionStatus, number> = {
      active: 0,
      validated: 0,
      invalidated: 0,
      expired: 0,
      superseded: 0,
      untested: 0,
    };
    const by_criticality: Record<AssumptionCriticality, number> = {
      foundational: 0,
      significant: 0,
      moderate: 0,
      minor: 0,
    };
    let untested_foundational = 0;
    let expired_active = 0;
    let confidenceSum = 0;
    const depCount: { id: string; dependent_count: number }[] = [];

    const now = new Date();
    for (const a of this.assumptions) {
      by_status[a.status]++;
      by_criticality[a.criticality]++;
      if (a.status === 'untested' && a.criticality === 'foundational') untested_foundational++;
      if (a.status === 'active' && a.expires_at && new Date(a.expires_at) < now) expired_active++;
      confidenceSum += a.confidence;
      const total = a.dependent_decisions.length + (this.dependentsMap.get(a.id)?.length ?? 0);
      depCount.push({ id: a.id, dependent_count: total });
    }

    depCount.sort((x, y) => y.dependent_count - x.dependent_count);
    const most_depended_on = depCount.slice(0, 10);

    return {
      total_assumptions: this.assumptions.length,
      by_status,
      by_criticality,
      untested_foundational,
      expired_active,
      average_confidence:
        this.assumptions.length === 0 ? 0 : confidenceSum / this.assumptions.length,
      most_depended_on,
      generated_at: new Date().toISOString(),
    };
  }

  getExpired(): AssumptionEntry[] {
    const now = new Date();
    return this.assumptions.filter(
      (a) =>
        a.expires_at &&
        new Date(a.expires_at) < now &&
        !['invalidated', 'superseded', 'expired'].includes(a.status)
    );
  }

  getUntestedFoundational(): AssumptionEntry[] {
    return this.assumptions.filter(
      (a) => a.status === 'untested' && a.criticality === 'foundational'
    );
  }

  getAssumptions(filters?: AssumptionFilters): AssumptionEntry[] {
    let list = this.assumptions.slice();
    if (filters?.category) list = list.filter((a) => a.category === filters.category);
    if (filters?.status) list = list.filter((a) => a.status === filters.status);
    if (filters?.criticality) list = list.filter((a) => a.criticality === filters.criticality);
    if (filters?.domain) list = list.filter((a) => a.domain === filters.domain);
    return list;
  }

  getByDecision(clearpath_trace_id: string): AssumptionEntry[] {
    return this.assumptions.filter((a) => a.dependent_decisions.includes(clearpath_trace_id));
  }

  verify(): VerifyResult {
    let valid = true;
    let prev = GENESIS;
    for (const a of this.assumptions) {
      if (a.previous_hash !== prev) valid = false;
      const expected = chainHash(a.previous_hash, assumptionPayload(a));
      if (a.hash !== expected) valid = false;
      prev = a.hash;
    }
    return { valid, entries_checked: this.assumptions.length };
  }

  toJSON(): string {
    const assumption_dependencies: { assumption_id: string; depends_on_id: string }[] = [];
    this.dependentsMap.forEach((ids, depends_on_id) => {
      ids.forEach((assumption_id) =>
        assumption_dependencies.push({ assumption_id, depends_on_id })
      );
    });
    const snapshot: RegistrySnapshot = {
      schema,
      system_id: this.system_id,
      assumptions: this.assumptions,
      assumption_dependencies,
    };
    return JSON.stringify(snapshot, null, 2);
  }

  toMarkdown(): string {
    const health = this.getHealth();
    const vulns = this.getVulnerabilities().slice(0, 5);
    const lines: string[] = [
      '# Assumption Registry',
      '',
      `**Schema:** ${schema}  `,
      `**System:** ${this.system_id}  `,
      `**Generated:** ${health.generated_at}`,
      '',
      '## Health',
      '',
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Total assumptions | ${health.total_assumptions} |`,
      `| Untested foundational | ${health.untested_foundational} |`,
      `| Expired (still active) | ${health.expired_active} |`,
      `| Average confidence | ${health.average_confidence.toFixed(2)} |`,
      '',
      '## Top vulnerabilities (cascade potential)',
      '',
    ];
    for (const v of vulns) {
      lines.push(`- **${v.assumption_id}**: ${v.total_affected} affected (depth ${v.cascade_depth})`);
    }
    return lines.join('\n');
  }

  static fromJSON(json: string): AssumptionRegistry {
    const snapshot: RegistrySnapshot = JSON.parse(json);
    if (snapshot.schema !== schema) throw new Error(`Invalid schema: expected ${schema}`);
    const reg = new AssumptionRegistry(snapshot.system_id);
    const R = reg as unknown as {
      assumptions: AssumptionEntry[];
      byId: Map<string, AssumptionEntry>;
      dependentsMap: Map<string, string[]>;
    };
    R.assumptions = snapshot.assumptions;
    R.byId = new Map(snapshot.assumptions.map((a) => [a.id, a]));
    R.dependentsMap = new Map();
    for (const link of snapshot.assumption_dependencies ?? []) {
      const list = R.dependentsMap.get(link.depends_on_id) ?? [];
      if (!list.includes(link.assumption_id)) list.push(link.assumption_id);
      R.dependentsMap.set(link.depends_on_id, list);
    }
    return reg;
  }
}
