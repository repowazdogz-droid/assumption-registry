# Assumption Registry Protocol (ARP-1.0)

Explicit assumption tracking for AI systems.

The Assumption Registry forces AI systems to declare their assumptions as first-class objects. Every assumption is registered with its basis, criticality, testability, and shelf life. The system tracks which decisions depend on which assumptions, and traces the cascade when assumptions fail.

Clearpath traces what was decided. The Assumption Registry traces what was taken for granted.

## Why this exists

Every AI decision rests on assumptions. Training data is representative. This guideline is current. The user wants the cheapest option. These assumptions are invisible — buried in weights, prompts, and defaults. When an assumption turns out to be wrong, nobody knows which decisions were affected or how far the damage reaches.

The Assumption Registry makes assumptions explicit, testable, and traceable. When one fails, you can see the blast radius instantly.

## What it does

Every assumption records what is being assumed, why, how critical it is, whether it can be tested, and which decisions depend on it. Assumptions can depend on other assumptions, creating a dependency graph. The system tracks the full lifecycle from registration through validation or invalidation.

Four capabilities:

**Explicit registration** forces every assumption to be declared with a plain-language statement, its basis, criticality level, and a test method if one exists. No more hidden beliefs driving decisions.

**Dependency mapping** traces which Clearpath decisions depend on which assumptions, and which assumptions depend on other assumptions. The cascade depth shows how far failure propagates.

**Cascade simulation** models what happens when an assumption fails before it actually fails. How many decisions are affected? How many downstream assumptions are compromised? Is the cascade contained, significant, or systemic?

**Registry health** monitors the overall assumption landscape. How many foundational assumptions are untested? How many active assumptions have expired? Which assumptions are most depended upon? These are the structural risks in the system.

## Criticality levels

- **foundational** — if this fails, all dependent decisions are compromised
- **significant** — failure affects multiple decisions materially
- **moderate** — failure affects some decisions
- **minor** — failure has limited impact

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
  criticality: 'foundational',
  confidence: 0.9,
  testable: true,
  test_method: 'Check NICE website for updates to NG59',
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
  criticality: 'significant',
  confidence: 0.85,
  testable: true,
  test_method: 'Cross-reference pathway with NG59 sections',
  domain: 'clinical',
  expires_at: null,
  dependent_decisions: ['clearpath-trace-002', 'clearpath-trace-003']
});

// Link dependency
registry.addAssumptionDependency(a2.id, a1.id);

// Simulate cascade if first assumption fails
const cascade = registry.simulateCascade(a1.id);
console.log(cascade.total_cascade_size); // all affected decisions
console.log(cascade.severity); // 'systemic' if widespread

// Check registry health
const health = registry.getHealth();
console.log(health.untested_foundational); // critical risk metric
console.log(health.expired_active); // assumptions past shelf life

// Verify integrity
console.log(registry.verify());
```

## Test

```bash
npm test
```

26 tests covering: core registration, hash chain integrity, status management (validation, invalidation, superseding, expiry), dependency mapping (decision dependencies, assumption dependencies, depth calculation, total affected), cascade simulation (simple, chained, systemic, contained), registry health (status counts, criticality counts, untested foundational risk, expired active), querying by category and status, lookup by Clearpath trace ID, and JSON export/import roundtrip.

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

Clearpath (CAP-1.0) traces decisions. The Assumption Registry (ARP-1.0) traces what those decisions took for granted. When an assumption is invalidated, the registry identifies every Clearpath trace that depends on it. Together they answer: what was decided, and which of those decisions are now compromised?

## Status

- 26 tests passing
- TypeScript, zero external dependencies
- Open-source (MIT)
- Part of the Omega reasoning infrastructure

## License

MIT
