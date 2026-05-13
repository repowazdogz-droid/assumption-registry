# Contributing to Omega Reasoning Infrastructure

## Overview: The Trust Stack
The **Assumption Registry Protocol (ARP-2.0)** provides the reasoning and assumption layer of the Omega trust stack. While **Clearpath (CAP-1.0)** traces the flow of decisions, the Assumption Registry provides the underlying justifications. Assumptions are linked to Clearpath decisions to ensure that every action is grounded in verified or consciously accepted premises.

## Registering a New Assumption
Use the `AssumptionRegistry.register()` method to add a new assumption to the chain. The registry automatically handles ID generation, timestamping, and cryptographic hashing.

```typescript
const registry = new AssumptionRegistry('system-id');
const entry = registry.register({
  agent_id: 'agent-001',
  category: 'world_model',
  statement: 'The API endpoint will be available during execution.',
  basis: 'Historical uptime data and maintenance schedule check.',
  criticality: 'load_bearing',
  domain: 'infrastructure',
  confidence: 0.95,
  testability: {
    status: 'testable',
    verification_type: 'runtime_telemetry',
    method: 'HTTP GET probe',
    acceptance_criteria: 'Status 200 within 500ms',
    evidence_required: ['latency_log'],
    last_tested_at: null,
    next_test_due_at: '2024-01-01T00:00:00Z',
    verifier: 'health-monitor'
  }
});
```

## ARP-2.0 Schema
### Required Fields for Registration
- `agent_id`: Identifier of the agent or system making the assumption.
- `category`: Type of assumption (e.g., `data_quality`, `world_model`, `causal`, `ethical`).
- `statement`: Clear description of what is being assumed.
- `basis`: The justification or evidence for making this assumption.
- `criticality`: Either `load_bearing` (essential for safety/success) or `peripheral`.
- `domain`: The functional area this assumption belongs to.
- `confidence`: Numeric value (0.0 to 1.0) representing certainty.

### Testability Metadata
The `testability` field defines how an assumption can be verified:
- `status`: `testable`, `partially_testable`, or `not_testable`.
- `verification_type`: `runtime_telemetry`, `human_review`, `formal_validator`, etc.
- `method`: Technical or process-based description of the test.

## Dependency Management
Assumptions are linked to other entities via `DependencyEdge`.

### Dependency Edge Types
- `derives_from`: This assumption is a logical consequence of another entity.
- `constrains`: This assumption limits the scope or application of another.
- `refines`: This assumption provides more detail to another.
- `contradicts`: Indicates a known conflict between assumptions.

## Pre-action Gate Reports
Before executing an action, the system generates a gate report to assess the integrity of the underlying reasoning.

### Verdicts
- **`pass`**: All relevant load-bearing assumptions are active/validated and not expired.
- **`warn`**: Dependency gaps exist (missing required edges) but no load-bearing failures.
- **`block`**: One or more load-bearing assumptions are unverified, expired, or invalidated.

## Cascade Simulation
The registry can simulate the impact of an assumption failure to determine system-wide risk.

### Severity Levels
- **`contained`**: Affects fewer than 5 decisions.
- **`significant`**: Affects 5 to 19 decisions.
- **`systemic`**: Affects 20+ decisions OR involves a `load_bearing` assumption failure.
