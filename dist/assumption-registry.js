"use strict";
/**
 * Assumption Registry Protocol (ARP-1.0) — main AssumptionRegistry class
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssumptionRegistry = void 0;
const types_1 = require("./types");
const hash_1 = require("./hash");
const validator_1 = require("./validator");
const impact_tracer_1 = require("./impact-tracer");
const cascade_detector_1 = require("./cascade-detector");
const GENESIS = '0';
class AssumptionRegistry {
    constructor(system_id) {
        this.assumptions = [];
        this.byId = new Map();
        /** assumption_id -> list of assumption IDs that depend on it (addAssumptionDependency(dependent_id, this_id)) */
        this.dependentsMap = new Map();
        this.system_id = system_id;
    }
    recomputeChainFrom(index) {
        const prev = index === 0 ? GENESIS : this.assumptions[index - 1].hash;
        for (let i = index; i < this.assumptions.length; i++) {
            const e = this.assumptions[i];
            e.previous_hash = i === 0 ? GENESIS : this.assumptions[i - 1].hash;
            e.hash = (0, hash_1.chainHash)(e.previous_hash, (0, hash_1.assumptionPayload)(e));
        }
    }
    register(entry) {
        const id = (0, hash_1.generateId)();
        const timestamp = new Date().toISOString();
        const status = entry.testable ? 'untested' : 'active';
        const previous_hash = this.assumptions.length === 0
            ? GENESIS
            : this.assumptions[this.assumptions.length - 1].hash;
        const full = {
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
        full.hash = (0, hash_1.chainHash)(previous_hash, (0, hash_1.assumptionPayload)(full));
        this.assumptions.push(full);
        this.byId.set(id, full);
        return full;
    }
    validate(assumption_id, result) {
        const entry = this.byId.get(assumption_id);
        if (!entry)
            throw new Error(`Assumption not found: ${assumption_id}`);
        if (!(0, validator_1.canBeValidated)(entry))
            throw new Error(`Assumption cannot be validated: ${assumption_id}`);
        const validated_at = new Date().toISOString();
        const fullResult = (0, validator_1.createValidationResult)(assumption_id, result.validated, result.method_used, result.evidence, validated_at);
        const updates = (0, validator_1.applyValidation)(entry, fullResult);
        Object.assign(entry, updates);
        const idx = this.assumptions.findIndex((a) => a.id === assumption_id);
        this.recomputeChainFrom(idx);
        return fullResult;
    }
    invalidate(assumption_id, reason) {
        const entry = this.byId.get(assumption_id);
        if (!entry)
            throw new Error(`Assumption not found: ${assumption_id}`);
        const invalidated_at = new Date().toISOString();
        entry.status = 'invalidated';
        entry.validated_at = null;
        entry.invalidated_at = invalidated_at;
        entry.invalidation_reason = reason;
        const idx = this.assumptions.findIndex((a) => a.id === assumption_id);
        this.recomputeChainFrom(idx);
        return entry;
    }
    supersede(assumption_id, new_assumption) {
        const old = this.byId.get(assumption_id);
        if (!old)
            throw new Error(`Assumption not found: ${assumption_id}`);
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
    expire(assumption_id) {
        const entry = this.byId.get(assumption_id);
        if (!entry)
            throw new Error(`Assumption not found: ${assumption_id}`);
        entry.status = 'expired';
        const idx = this.assumptions.findIndex((a) => a.id === assumption_id);
        this.recomputeChainFrom(idx);
        return entry;
    }
    addDependency(assumption_id, clearpath_trace_id) {
        const entry = this.byId.get(assumption_id);
        if (!entry)
            throw new Error(`Assumption not found: ${assumption_id}`);
        if (!entry.dependent_decisions.includes(clearpath_trace_id)) {
            entry.dependent_decisions.push(clearpath_trace_id);
            const idx = this.assumptions.findIndex((a) => a.id === assumption_id);
            this.recomputeChainFrom(idx);
        }
    }
    addAssumptionDependency(assumption_id, depends_on_id) {
        if (!this.byId.has(assumption_id))
            throw new Error(`Assumption not found: ${assumption_id}`);
        if (!this.byId.has(depends_on_id))
            throw new Error(`Assumption not found: ${depends_on_id}`);
        const list = this.dependentsMap.get(depends_on_id) ?? [];
        if (!list.includes(assumption_id)) {
            list.push(assumption_id);
            this.dependentsMap.set(depends_on_id, list);
        }
    }
    getDependencyMap(assumption_id) {
        return (0, impact_tracer_1.getDependencyMap)(assumption_id, this.assumptions, this.dependentsMap);
    }
    simulateCascade(assumption_id) {
        return (0, cascade_detector_1.simulateCascade)(assumption_id, this.assumptions, this.dependentsMap, (id) => this.getDependencyMap(id));
    }
    getVulnerabilities() {
        const maps = this.assumptions.map((a) => this.getDependencyMap(a.id));
        return maps.sort((a, b) => b.total_affected - a.total_affected);
    }
    getHealth() {
        const by_status = {
            active: 0,
            validated: 0,
            invalidated: 0,
            expired: 0,
            superseded: 0,
            untested: 0,
        };
        const by_criticality = {
            foundational: 0,
            significant: 0,
            moderate: 0,
            minor: 0,
        };
        let untested_foundational = 0;
        let expired_active = 0;
        let confidenceSum = 0;
        const depCount = [];
        const now = new Date();
        for (const a of this.assumptions) {
            by_status[a.status]++;
            by_criticality[a.criticality]++;
            if (a.status === 'untested' && a.criticality === 'foundational')
                untested_foundational++;
            if (a.status === 'active' && a.expires_at && new Date(a.expires_at) < now)
                expired_active++;
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
            average_confidence: this.assumptions.length === 0 ? 0 : confidenceSum / this.assumptions.length,
            most_depended_on,
            generated_at: new Date().toISOString(),
        };
    }
    getExpired() {
        const now = new Date();
        return this.assumptions.filter((a) => a.expires_at &&
            new Date(a.expires_at) < now &&
            !['invalidated', 'superseded', 'expired'].includes(a.status));
    }
    getUntestedFoundational() {
        return this.assumptions.filter((a) => a.status === 'untested' && a.criticality === 'foundational');
    }
    getAssumptions(filters) {
        let list = this.assumptions.slice();
        if (filters?.category)
            list = list.filter((a) => a.category === filters.category);
        if (filters?.status)
            list = list.filter((a) => a.status === filters.status);
        if (filters?.criticality)
            list = list.filter((a) => a.criticality === filters.criticality);
        if (filters?.domain)
            list = list.filter((a) => a.domain === filters.domain);
        return list;
    }
    getByDecision(clearpath_trace_id) {
        return this.assumptions.filter((a) => a.dependent_decisions.includes(clearpath_trace_id));
    }
    verify() {
        let valid = true;
        let prev = GENESIS;
        for (const a of this.assumptions) {
            if (a.previous_hash !== prev)
                valid = false;
            const expected = (0, hash_1.chainHash)(a.previous_hash, (0, hash_1.assumptionPayload)(a));
            if (a.hash !== expected)
                valid = false;
            prev = a.hash;
        }
        return { valid, entries_checked: this.assumptions.length };
    }
    toJSON() {
        const assumption_dependencies = [];
        this.dependentsMap.forEach((ids, depends_on_id) => {
            ids.forEach((assumption_id) => assumption_dependencies.push({ assumption_id, depends_on_id }));
        });
        const snapshot = {
            schema: types_1.schema,
            system_id: this.system_id,
            assumptions: this.assumptions,
            assumption_dependencies,
        };
        return JSON.stringify(snapshot, null, 2);
    }
    toMarkdown() {
        const health = this.getHealth();
        const vulns = this.getVulnerabilities().slice(0, 5);
        const lines = [
            '# Assumption Registry',
            '',
            `**Schema:** ${types_1.schema}  `,
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
    static fromJSON(json) {
        const snapshot = JSON.parse(json);
        if (snapshot.schema !== types_1.schema)
            throw new Error(`Invalid schema: expected ${types_1.schema}`);
        const reg = new AssumptionRegistry(snapshot.system_id);
        const R = reg;
        R.assumptions = snapshot.assumptions;
        R.byId = new Map(snapshot.assumptions.map((a) => [a.id, a]));
        R.dependentsMap = new Map();
        for (const link of snapshot.assumption_dependencies ?? []) {
            const list = R.dependentsMap.get(link.depends_on_id) ?? [];
            if (!list.includes(link.assumption_id))
                list.push(link.assumption_id);
            R.dependentsMap.set(link.depends_on_id, list);
        }
        return reg;
    }
}
exports.AssumptionRegistry = AssumptionRegistry;
