# Contributing to Assumption Registry

Thank you for contributing to the Assumption Registry. This document explains how to work with the ARP-2.0 protocol and integrate new assumptions.

## Registering a New Assumption

New assumptions are registered via the `AssumptionRegistry.register()` method.

```typescript
const registry = new AssumptionRegistry('system-id');

const entry = registry.register({
  agent_id: 'agent-001',
  category: 'world_model',
  statement: 'The API endpoint remains stable during the execution window.',
  basis: 'Vendor SLA and historical uptime.',
  criticality: 'load_bearing',
  confidence: 0.95,
  domain: 'operations',
  expires_at: '2026-12-31T23:59:59Z',
  testability: {
    status: 'testable',
    verification_type: 'runtime_telemetry',
    method: 'Ping health endpoint',
    acceptance_criteria: 'HTTP 200 OK',
    evidence_required: ['health_logs'],
    last_tested_at: null,
    next_test_due_at: '2026-07-01T00:00:00Z',
    verifier: 'system-monitor'
  }
});
```

## ARP-2.0 Schema Requirements

### Required Fields
- `agent_id`: Identifier for the agent making the assumption.
- `category`: One of `data_quality`, `world_model`, `user_intent`, `temporal`, `causal`, `distributional`, `ethical`, `operational`, `regulatory`, or `domain_specific`.
- `statement`: Plain-language description of what is assumed.
- `basis`: The evidence or reasoning supporting the assumption.
- `criticality`: `load_bearing` (blocks actions if unverified/expired) or `peripheral`.
- `confidence`: Numerical value (0-1).
- `domain`: Contextual area (e.g., 'finance', 'clinical').

### Testability Metadata
The `testability` object is required for full ARP-2.0 compliance:
- `status`: `testable`, `partially_testable`, or `not_testable`.
- `verification_type`: e.g., `external_source_check`, `runtime_telemetry`, `human_review`.
- `method`: String describing how to verify.
- `acceptance_criteria`: What constitutes a successful test.
- `evidence_required`: Array of required evidence types.

## Dependency Edge Types

Assumptions and decisions are linked via typed edges:
- `derives_from`: One assumption is derived from another.
- `constrains`: A decision or assumption is constrained by another node.
- `refines`: One node narrows or clarifies another.
- `contradicts`: One node conflicts with another.

Use `registry.addAssumptionDependency(dependentId, dependsOnId, type)` to link assumptions.

## Pre-action Gate Reports

Before executing an action, generate a gate report using `registry.generatePreActionGateReport({ action_id, decision_ids })`.

### Verdicts
- **pass**: All relevant load-bearing assumptions are validated and current.
- **warn**: There are dependency gaps (missing required edges for gate evaluation).
- **block**: One or more load-bearing assumptions are unverified, expired, or invalidated.

## Cascade Simulation

Simulate the impact of an assumption failing using `registry.simulateCascade(id)`.

### Severity Levels
- **contained**: Affects fewer than 5 downstream decisions.
- **significant**: Affects between 5 and 19 downstream decisions.
- **systemic**: Affects 20 or more decisions, or the failed assumption is `load_bearing`.

## Trust Stack: Assumption Registry & Clearpath

In the Omega reasoning infrastructure:
- **Clearpath (CAP-1.0)**: Traces the decision-making process (what was decided).
- **Assumption Registry (ARP-2.0)**: Traces the underlying beliefs (what was taken for granted).

When an assumption is invalidated, the Registry identifies every Clearpath decision that depends on it, allowing for immediate risk assessment and rollback if necessary.
