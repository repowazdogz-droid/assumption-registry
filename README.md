# Assumption Registry Protocol (ARP-2.0)

Pre-action assumption governance for AI systems.

The Assumption Registry forces AI systems to declare their assumptions as first-class objects. Every assumption is registered with its basis, load-bearing classification, structured testability metadata, and shelf life. The system tracks typed dependency edges and reports which load-bearing assumptions must be verified before an action proceeds.

Clearpath traces what was decided. The Assumption Registry traces what was taken for granted.

## Why this exists

Every AI decision rests on assumptions. Training data is representative. This guideline is current. The user wants the cheapest option. These assumptions are invisible — buried in weights, prompts, and defaults. When an assumption turns out to be wrong, nobody knows which decisions were affected or how far the damage reaches.

The Assumption Registry makes assumptions explicit, testable, and traceable. When one fails, you can see the blast radius instantly. ARP-2.0 also asks the pre-action question: which beliefs are load-bearing for this action, and are any still unverified?

## What it does

Every assumption records what is being assumed, why, whether it is load-bearing, how it can be tested, and which decisions or assumptions depend on it. Assumptions can depend on other assumptions through typed edges, creating a dependency graph. The system tracks the full lifecycle from registration through validation or invalidation.

Four capabilities:

**Explicit registration** forces every assumption to be declared with a plain-language statement, its basis, criticality classification, and verification metadata if it exists. No more hidden beliefs driving decisions.

**Dependency mapping** traces which Clearpath decisions depend on which assumptions, and which assumptions derive from, constrain, refine, or contradict other assumptions. The cascade depth shows how far failure propagates.

**Cascade simulation** models what happens when an assumption fails before it actually fails. How many decisions are affected? How many downstream assumptions are compromised? Is the cascade contained, significant, or systemic?

**Pre-action gate reports** identify unverified or expired load-bearing assumptions before a decision or tool action proceeds.

**Registry health** monitors the overall assumption landscape. How many load-bearing assumptions are unverified? How many active assumptions have expired? Which assumptions are most depended upon? These are the structural risks in the system.

## Criticality classification

- **load_bearing** — the action or downstream decision should not proceed while this assumption is unverified or expired
- **peripheral** — the assumption should be recorded and monitored, but it is not a gate blocker on its own

ARP-2.0 follows the design in `V2_DESIGN.md`: assumptions are infrastructure. Some are decorative, some are material, and some are load-bearing.

Repository: https://github.com/repowazdogz-droid/assumption-registry

## Install

```bash
npm install
npm run build
```

## Quick start

```javascript
const { AssumptionRegistry } = require('./dist/index');

const registry = new AssumptionRegistry('spine-case');

// Register an assumption
const a1 = registry.register({
  agent_id: 'spine-case',
  category: 'domain_specific',
  statement: 'NICE guideline NG59 for low back pain is current as of 2026',
  basis: 'Published by NICE, last updated 2024',
  criticality: 'load_bearing',
  confidence: 0.9,
  testability: {
    status: 'testable',
    verification_type: 'external_source_check',
    method: 'Check NICE website for updates to NG59',
    acceptance_criteria: 'No newer NICE guideline supersedes NG59',
    evidence_required: ['NICE guideline page'],
    last_tested_at: null,
    next_test_due_at: '2026-06-01T00:00:00Z',
    verifier: null
  },
  domain: 'clinical',
  expires_at: '2026-06-01T00:00:00Z',
  dependent_decisions: ['clearpath-trace-001']
});

// Register another assumption that depends on the first
const a2 = registry.register({
  agent_id: 'spine-case',
  category: 'causal',
  statement: 'Conservative management pathway follows current NICE guidance',
  basis: 'Derived from NG59 recommendations',
  criticality: 'peripheral',
  confidence: 0.85,
  testability: {
    status: 'testable',
    verification_type: 'human_review',
    method: 'Cross-reference pathway with NG59 sections',
    acceptance_criteria: 'Pathway matches current NG59 recommendations',
    evidence_required: ['review notes'],
    last_tested_at: null,
    next_test_due_at: null,
    verifier: null
  },
  domain: 'clinical',
  expires_at: null,
  dependent_decisions: ['clearpath-trace-002', 'clearpath-trace-003']
});

// Link typed dependency
registry.addAssumptionDependency(a2.id, a1.id, 'derives_from');

// Generate a pre-action gate report before acting on a Clearpath decision
const gate = registry.generatePreActionGateReport({
  action_id: 'clinical-tool-action-001',
  decision_ids: ['clearpath-trace-001']
});
console.log(gate.verdict); // 'block' until load-bearing assumptions are validated

// Simulate cascade if first assumption fails
const cascade = registry.simulateCascade(a1.id);
console.log(cascade.total_cascade_size); // all affected decisions
console.log(cascade.severity); // 'systemic' if widespread

// Check registry health
const health = registry.getHealth();
console.log(health.unverified_load_bearing); // critical risk metric
console.log(health.expired_active); // assumptions past shelf life

// Verify integrity
console.log(registry.verify());
```

## Test

```bash
npm test
```

31 tests covering: core registration, hash chain integrity, status management (validation, invalidation, superseding, expiry), dependency mapping (decision dependencies, typed assumption dependencies, depth calculation, total affected), cascade simulation (simple, chained, systemic, contained), registry health (status counts, criticality counts, unverified load-bearing risk, expired active), querying by category and status, lookup by Clearpath trace ID, JSON export/import roundtrip, ARP-2.0 testability metadata, typed dependency edge persistence, pre-action gate reports, and ARP-1.0 snapshot migration.

## Testability metadata

ARP-2.0 replaces the old boolean-only testability model with structured metadata:

```typescript
interface TestabilityMetadata {
  status: 'testable' | 'partially_testable' | 'not_testable';
  verification_type:
    | 'external_source_check'
    | 'runtime_telemetry'
    | 'formal_validator'
    | 'stress_test'
    | 'human_review'
    | 'cross_model_consistency'
    | 'not_available';
  method: string | null;
  acceptance_criteria: string | null;
  evidence_required: string[];
  last_tested_at: string | null;
  next_test_due_at: string | null;
  verifier: string | null;
}
```

The legacy `testable` and `test_method` registration shape is still accepted as an adapter path and is normalized into `testability`.

## Dependency graph types

Dependency edges are persisted as first-class records. Supported edge types:

- **derives_from** — one assumption is derived from another
- **constrains** — a decision, action, or assumption is constrained by another node
- **refines** — one assumption narrows or clarifies another
- **contradicts** — one assumption conflicts with another

## Pre-action gate reports

`generatePreActionGateReport({ action_id, decision_ids, assumption_ids })` returns:

- the load-bearing assumptions relevant to the action
- unverified load-bearing blockers
- expired load-bearing blockers
- dependency gaps
- a verdict of `pass`, `warn`, or `block`

## Assumption categories

| Category | Description | Example |
|----------|-------------|---------|
| data_quality | Assumptions about input data | "Training data is representative" |
| world_model | Assumptions about how the world works | "Interest rates will remain stable" |
| user_intent | Assumptions about what the user wants | "User prefers cheapest option" |
| temporal | Assumptions about time and currency | "This guideline is current" |
| causal | Assumptions about cause and effect | "Treatment X causes outcome Y" |
| distributional | Assumptions about data distributions | "Normal distribution applies" |
| ethical | Assumptions about values and norms | "Privacy is preferred over convenience" |
| operational | Assumptions about system operation | "API will remain available" |
| regulatory | Assumptions about legal requirements | "GDPR applies to this data" |
| domain_specific | Domain-specific assumptions | "Standard surgical risk factors apply" |

## Cascade severity

| Level | Threshold | Meaning |
|-------|-----------|---------|
| contained | <5 decisions affected | Localised impact |
| significant | 5-20 decisions affected | Material impact across multiple areas |
| systemic | 20+ decisions or any foundational assumption in chain | Structural failure |

## How it works

The Assumption Registry is a library, not a service. No server. No database. No UI. It is the protocol layer that other applications build on.

A clinical AI imports the Assumption Registry → every guideline assumption is registered and monitored for currency. A financial AI imports the Assumption Registry → every market assumption is tracked and cascaded when conditions change. A regulatory AI imports the Assumption Registry → every legal assumption is tested against current law.

The protocol is domain-agnostic. The assumption mechanism is identical. The stakes change.

## Relationship to other protocols

Clearpath (CAP-1.0) traces decisions. The Assumption Registry (ARP-2.0) traces what those decisions took for granted. When an assumption is invalidated, the registry identifies every Clearpath trace that depends on it. Together they answer: what was decided, and which of those decisions are now compromised?

## Breaking and migration notes

ARP-2.0 emits `schema: "ARP-2.0"` snapshots with `criticality: "load_bearing" | "peripheral"`, optional `testability` metadata, and `dependency_edges`.

`AssumptionRegistry.fromJSON()` is backward-compatible on read for `ARP-1.0` snapshots. It migrates legacy criticality values, converts `testable` and `test_method` into `testability`, maps old assumption dependency links into typed `derives_from` edges, and emits ARP-2.0 snapshots on subsequent export.

## Status

- 31 tests passing
- TypeScript, zero external dependencies
- Open-source (MIT)
- Part of the Omega reasoning infrastructure

## License

MIT
