"use strict";
/**
 * Assumption Registry Protocol (ARP-2.0) — main AssumptionRegistry class
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssumptionRegistry = void 0;
const types_1 = require("./types");
const hash_1 = require("./hash");
const validator_1 = require("./validator");
const impact_tracer_1 = require("./impact-tracer");
const cascade_detector_1 = require("./cascade-detector");
const GENESIS = '0';
function normalizeCriticality(criticality) {
    if (!criticality)
        throw new Error('criticality is required for ARP-2.0 assumptions');
    if (criticality === 'load_bearing' || criticality === 'peripheral')
        return criticality;
    if (criticality === 'foundational')
        return 'load_bearing';
    return 'peripheral';
}
function normalizeTestability(entry) {
    if (entry.testability)
        return entry.testability;
    if (entry.testable === undefined && entry.test_method === undefined)
        return undefined;
    const testable = entry.testable ?? Boolean(entry.test_method);
    return {
        status: testable ? 'testable' : 'not_testable',
        verification_type: testable ? 'human_review' : 'not_available',
        method: entry.test_method ?? null,
        acceptance_criteria: null,
        evidence_required: [],
        last_tested_at: null,
        next_test_due_at: null,
        verifier: null,
    };
}
function isUnverified(entry) {
    return entry.status !== 'validated';
}
function isExpired(entry, now) {
    return entry.status === 'expired' || Boolean(entry.expires_at && new Date(entry.expires_at) < now);
}
class AssumptionRegistry {
    constructor(system_id) {
        this.assumptions = [];
        this.byId = new Map();
        this.dependencyEdges = [];
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
    addEdge(edge) {
        const duplicate = this.dependencyEdges.find((e) => e.from_id === edge.from_id &&
            e.from_type === edge.from_type &&
            e.type === edge.type &&
            e.to_id === edge.to_id &&
            e.to_type === edge.to_type);
        if (duplicate)
            return duplicate;
        const full = {
            ...edge,
            id: (0, hash_1.generateId)(),
            created_at: new Date().toISOString(),
        };
        this.dependencyEdges.push(full);
        return full;
    }
    rebuildDependentsMap() {
        this.dependentsMap = new Map();
        for (const edge of this.dependencyEdges) {
            if (edge.from_type !== 'assumption' || edge.to_type !== 'assumption')
                continue;
            const list = this.dependentsMap.get(edge.to_id) ?? [];
            if (!list.includes(edge.from_id))
                list.push(edge.from_id);
            this.dependentsMap.set(edge.to_id, list);
        }
    }
    register(entry) {
        const id = (0, hash_1.generateId)();
        const timestamp = new Date().toISOString();
        const testability = normalizeTestability(entry);
        const status = testability?.status === 'testable' ? 'untested' : 'active';
        const previous_hash = this.assumptions.length === 0
            ? GENESIS
            : this.assumptions[this.assumptions.length - 1].hash;
        const full = {
            ...entry,
            id,
            timestamp,
            criticality: normalizeCriticality(entry.criticality),
            testability,
            status,
            dependent_decisions: entry.dependent_decisions ?? [],
            dependencies: [],
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
            const edge = this.addEdge({
                from_id: clearpath_trace_id,
                from_type: 'decision',
                type: 'constrains',
                to_id: assumption_id,
                to_type: 'assumption',
                required_for_gate: true,
            });
            if (!entry.dependencies.includes(edge.id))
                entry.dependencies.push(edge.id);
            const idx = this.assumptions.findIndex((a) => a.id === assumption_id);
            this.recomputeChainFrom(idx);
        }
    }
    addAssumptionDependency(assumption_id, depends_on_id, type = 'derives_from') {
        if (!this.byId.has(assumption_id))
            throw new Error(`Assumption not found: ${assumption_id}`);
        if (!this.byId.has(depends_on_id))
            throw new Error(`Assumption not found: ${depends_on_id}`);
        const entry = this.byId.get(assumption_id);
        const edge = this.addEdge({
            from_id: assumption_id,
            from_type: 'assumption',
            type,
            to_id: depends_on_id,
            to_type: 'assumption',
            required_for_gate: true,
        });
        if (entry && !entry.dependencies.includes(edge.id)) {
            entry.dependencies.push(edge.id);
            const idx = this.assumptions.findIndex((a) => a.id === assumption_id);
            this.recomputeChainFrom(idx);
        }
        const list = this.dependentsMap.get(depends_on_id) ?? [];
        if (!list.includes(assumption_id)) {
            list.push(assumption_id);
            this.dependentsMap.set(depends_on_id, list);
        }
        return edge;
    }
    addDependencyEdge(edge) {
        if (edge.from_type === 'assumption' && !this.byId.has(edge.from_id)) {
            throw new Error(`Assumption not found: ${edge.from_id}`);
        }
        if (edge.to_type === 'assumption' && !this.byId.has(edge.to_id)) {
            throw new Error(`Assumption not found: ${edge.to_id}`);
        }
        const full = this.addEdge(edge);
        if (edge.from_type === 'assumption') {
            const from = this.byId.get(edge.from_id);
            if (from && !from.dependencies.includes(full.id)) {
                from.dependencies.push(full.id);
                this.recomputeChainFrom(this.assumptions.findIndex((a) => a.id === from.id));
            }
        }
        if (edge.to_type === 'assumption') {
            const to = this.byId.get(edge.to_id);
            if (to && !to.dependencies.includes(full.id)) {
                to.dependencies.push(full.id);
                this.recomputeChainFrom(this.assumptions.findIndex((a) => a.id === to.id));
            }
        }
        this.rebuildDependentsMap();
        return full;
    }
    getDependencyEdges() {
        return this.dependencyEdges.slice();
    }
    generatePreActionGateReport(context) {
        const relevant = new Set(context.assumption_ids ?? []);
        for (const decisionId of context.decision_ids ?? []) {
            this.getByDecision(decisionId).forEach((a) => relevant.add(a.id));
            this.dependencyEdges
                .filter((e) => e.from_type === 'decision' && e.from_id === decisionId && e.to_type === 'assumption')
                .forEach((e) => relevant.add(e.to_id));
        }
        if (relevant.size === 0)
            this.assumptions.forEach((a) => relevant.add(a.id));
        const dependency_gaps = [];
        for (const edge of this.dependencyEdges) {
            if (!edge.required_for_gate)
                continue;
            if (edge.from_type === 'assumption' && relevant.has(edge.from_id))
                relevant.add(edge.to_id);
            if (edge.to_type === 'assumption' && relevant.has(edge.to_id) && edge.from_type === 'assumption') {
                relevant.add(edge.from_id);
            }
        }
        const now = new Date();
        const loadBearing = [...relevant]
            .map((id) => this.byId.get(id))
            .filter((a) => Boolean(a && a.criticality === 'load_bearing'));
        const load_bearing_assumptions = loadBearing.map((a) => a.id);
        const unverified_load_bearing_assumptions = loadBearing.filter(isUnverified).map((a) => a.id);
        const expired_load_bearing_assumptions = loadBearing.filter((a) => isExpired(a, now)).map((a) => a.id);
        for (const assumptionId of load_bearing_assumptions) {
            const hasRequiredEdge = this.dependencyEdges.some((e) => e.required_for_gate && (e.from_id === assumptionId || e.to_id === assumptionId));
            if (!hasRequiredEdge)
                dependency_gaps.push(assumptionId);
        }
        const verdict = unverified_load_bearing_assumptions.length > 0 || expired_load_bearing_assumptions.length > 0
            ? 'block'
            : dependency_gaps.length > 0
                ? 'warn'
                : 'pass';
        return {
            action_id: context.action_id,
            generated_at: new Date().toISOString(),
            verdict,
            load_bearing_assumptions,
            unverified_load_bearing_assumptions,
            expired_load_bearing_assumptions,
            dependency_gaps,
        };
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
            load_bearing: 0,
            peripheral: 0,
        };
        let untested_foundational = 0;
        let unverified_load_bearing = 0;
        let expired_load_bearing = 0;
        let expired_active = 0;
        let confidenceSum = 0;
        const depCount = [];
        const now = new Date();
        for (const a of this.assumptions) {
            by_status[a.status]++;
            by_criticality[a.criticality]++;
            if (a.status === 'untested' && a.criticality === 'load_bearing')
                untested_foundational++;
            if (isUnverified(a) && a.criticality === 'load_bearing')
                unverified_load_bearing++;
            if (isExpired(a, now) && a.criticality === 'load_bearing')
                expired_load_bearing++;
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
            by_criticality: {
                ...by_criticality,
                foundational: by_criticality.load_bearing,
                significant: by_criticality.load_bearing,
                moderate: by_criticality.peripheral,
                minor: by_criticality.peripheral,
            },
            untested_foundational,
            unverified_load_bearing,
            expired_load_bearing,
            unresolved_dependency_gaps: this.generatePreActionGateReport({ action_id: 'health' }).dependency_gaps.length,
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
        return this.assumptions.filter((a) => a.status === 'untested' && a.criticality === 'load_bearing');
    }
    getAssumptions(filters) {
        let list = this.assumptions.slice();
        if (filters?.category)
            list = list.filter((a) => a.category === filters.category);
        if (filters?.status)
            list = list.filter((a) => a.status === filters.status);
        if (filters?.criticality) {
            const criticality = normalizeCriticality(filters.criticality);
            list = list.filter((a) => a.criticality === criticality);
        }
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
        const snapshot = {
            schema: types_1.schema,
            system_id: this.system_id,
            assumptions: this.assumptions,
            dependency_edges: this.dependencyEdges,
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
            `| Unverified load-bearing | ${health.unverified_load_bearing} |`,
            `| Expired load-bearing | ${health.expired_load_bearing} |`,
            `| Dependency gaps | ${health.unresolved_dependency_gaps} |`,
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
        const parsed = JSON.parse(json);
        if (parsed.schema !== types_1.schema && parsed.schema !== types_1.legacySchema) {
            throw new Error(`Invalid schema: expected ${types_1.schema} or ${types_1.legacySchema}`);
        }
        const snapshot = parsed.schema === types_1.legacySchema ? AssumptionRegistry.migrateV1Snapshot(parsed) : parsed;
        const reg = new AssumptionRegistry(snapshot.system_id);
        const R = reg;
        R.assumptions = snapshot.assumptions;
        R.byId = new Map(snapshot.assumptions.map((a) => [a.id, a]));
        R.dependencyEdges = snapshot.dependency_edges;
        reg.rebuildDependentsMap();
        return reg;
    }
    static migrateV1Snapshot(snapshot) {
        const dependency_edges = [];
        const assumptions = snapshot.assumptions.map((a) => {
            const migrated = {
                ...a,
                criticality: normalizeCriticality(a.criticality),
                testability: normalizeTestability(a),
                dependencies: [],
            };
            return migrated;
        });
        const byId = new Map(assumptions.map((a) => [a.id, a]));
        for (const a of assumptions) {
            for (const decisionId of a.dependent_decisions) {
                const edge = {
                    id: (0, hash_1.generateId)(),
                    from_id: decisionId,
                    from_type: 'decision',
                    type: 'constrains',
                    to_id: a.id,
                    to_type: 'assumption',
                    required_for_gate: true,
                    created_at: new Date().toISOString(),
                };
                dependency_edges.push(edge);
                a.dependencies.push(edge.id);
            }
        }
        for (const link of snapshot.assumption_dependencies ?? []) {
            const edge = {
                id: (0, hash_1.generateId)(),
                from_id: link.assumption_id,
                from_type: 'assumption',
                type: 'derives_from',
                to_id: link.depends_on_id,
                to_type: 'assumption',
                required_for_gate: true,
                created_at: new Date().toISOString(),
            };
            dependency_edges.push(edge);
            byId.get(link.assumption_id)?.dependencies.push(edge.id);
            byId.get(link.depends_on_id)?.dependencies.push(edge.id);
        }
        let previous_hash = GENESIS;
        for (const assumption of assumptions) {
            assumption.previous_hash = previous_hash;
            assumption.hash = (0, hash_1.chainHash)(previous_hash, (0, hash_1.assumptionPayload)(assumption));
            previous_hash = assumption.hash;
        }
        return {
            schema: types_1.schema,
            system_id: snapshot.system_id,
            assumptions,
            dependency_edges,
        };
    }
}
exports.AssumptionRegistry = AssumptionRegistry;
