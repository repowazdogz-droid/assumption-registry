# 1. CURRENT STATE
ARP-1.0 is a small TypeScript library for explicit assumption tracking, not a service. The package metadata identifies `assumption-registry` version `1.0.1`, with `dist/index.js` and `dist/index.d.ts` as published entry points, MIT licensing, Jest tests, TypeScript strict mode, and zero runtime dependencies beyond Node `crypto`. The latest local commit is `d2781e5` on 2026-04-26, and `git status --short` was clean at inspection time.

The current schema already includes assumption category, statement, basis, criticality, status, confidence, a boolean `testable`, nullable `test_method`, domain, expiry, dependent Clearpath decision IDs, supersession fields, validation/invalidation timestamps, hash, and previous hash. `RegistrySnapshot` stores `schema: "ARP-1.0"`, `system_id`, assumptions, and persisted assumption-to-assumption dependency links.

The implementation provides registration, validation, invalidation, supersession, expiry, decision dependencies, assumption dependencies, dependency maps, cascade simulation, vulnerability ranking, registry health, expired assumption lookup, untested foundational lookup, Clearpath lookup, hash-chain verification, JSON import/export, and Markdown export. Tests cover 26 behaviours across registration, hash integrity, lifecycle, dependency mapping, cascade severity, health metrics, querying, and JSON roundtrip.

The main gap is not absence of criticality, testability, or graph concepts. Those primitives exist, but they are too coarse for a pre-action governance role. Criticality is a flat enum without rationale or gate consequence; testability is a boolean plus method string rather than structured verification metadata; the dependency graph exists but does not carry relation type, edge strength, evidence links, or gate requirements. ARP-2.0 should therefore deepen the existing primitives rather than replace the protocol with a new architecture.

# 2. RESEARCH LANDSCAPE (2025-2026)
Recent agent-governance work is moving from passive logs toward pre-action, contract-bearing execution records. The 2026 trace-based assurance work frames Message-Action Traces as typed records with provenance and machine-checkable contract verdicts, including verification-before-action, containment, and policy mediation at the language-to-action boundary: https://arxiv.org/html/2603.18096v1.

Agent provenance research is converging on graph-shaped lineage. PROV-AGENT extends W3C PROV concepts for agent workflows so auditors can ask which input data, tool calls, model outputs, and agent decisions produced a downstream result, and how erroneous data propagated: https://arxiv.org/html/2508.02866v1. W3C PROV-O remains the stable public vocabulary for entities, activities, agents, derivation, responsibility, and influence: https://www.w3.org/TR/prov-o/.

Agent uncertainty research now treats uncertainty as trajectory-level control information, not just final-answer confidence. The 2026 agent UQ survey argues for turn-level and trajectory-level uncertainty over actions, observations, and environment states: https://arxiv.org/html/2602.05073v2. Related 2026 work argues that text-only observation cannot reliably verify epistemic honesty, so stronger telemetry or externally checkable evidence is needed for high-stakes governance.

Pre-action reasoning papers point toward explicit check-then-act designs. MOSAIC uses plan/check/act or refuse loops for safety-critical tool use, while SAVER-style verified reasoning localizes missing assumptions, invalid preconditions, unjustified inferences, contradictions, and overgeneralizations before commitment to action. Verification-aware planning work similarly encodes passing criteria as verification functions before subtasks can proceed.

Dependency-graph research is directly relevant. Agentproof statically verifies workflow graphs against temporal safety policies before execution: https://arxiv.org/html/2603.20356v1. SeqCV highlights that LLM-agent dependency graphs often assume conditional independence that fails in practice, so downstream work should not consume unverified upstream outputs as if they were ground truth.

The practical public framing is also emerging outside academic papers: runtime governance asks whether the next specific action is authorized under current policy, identity, approval state, data boundary, budget, and audit evidence. For ARP-2.0, the analogous question is: which assumptions are load-bearing for this action, are they testable, have they been tested recently enough, and what must happen if they are unresolved?

# 3. SCHEMA DECISION
ARP-2.0 should be a breaking schema version with a narrow compatibility story: keep ARP-1.0's library shape and domain-agnostic framing, but promote load-bearing classification, structured testability metadata, typed dependency edges, and pre-action gate reports into the canonical schema.

The recommended direction is not to add another standalone risk score. ARP already has confidence, criticality, health, and cascade severity; adding a single composite score would hide the exact thing the protocol is meant to expose. ARP-2.0 should instead make the components inspectable: criticality rationale, failure mode, verification status, evidence requirements, expiry, dependency edges, and gate verdict.

Use `schema: "ARP-2.0"` in snapshots. Provide explicit migration from ARP-1.0 by mapping `testable` and `test_method` into a `testability` object, mapping existing assumption dependencies into graph edges, and deriving an initial `gate_policy` from criticality. Do not preserve ARP-1.0 field names inside new entries unless the implementation chooses an adapter layer; the public schema should be clean.

# 4. PROPOSED SCHEMA CHANGES
Replace `testable: boolean` and `test_method: string | null` with structured testability metadata:

```ts
type TestabilityStatus = 'testable' | 'partially_testable' | 'not_testable';
type VerificationType =
  | 'external_source_check'
  | 'runtime_telemetry'
  | 'formal_validator'
  | 'stress_test'
  | 'human_review'
  | 'cross_model_consistency'
  | 'not_available';

interface TestabilityMetadata {
  status: TestabilityStatus;
  verification_type: VerificationType;
  method: string | null;
  acceptance_criteria: string | null;
  evidence_required: string[];
  last_tested_at: string | null;
  next_test_due_at: string | null;
  verifier: string | null;
}
```

Replace flat criticality-only semantics with criticality plus load-bearing governance metadata:

```ts
type AssumptionCriticality = 'foundational' | 'significant' | 'moderate' | 'minor';
type GatePolicy = 'block_if_unverified' | 'escalate_if_unverified' | 'warn_if_unverified' | 'monitor_only';
type FailureMode =
  | 'missing_assumption'
  | 'invalid_precondition'
  | 'unsupported_inference'
  | 'stale_source'
  | 'contradiction'
  | 'overgeneralization'
  | 'operational_unavailability'
  | 'unknown';

interface CriticalityMetadata {
  level: AssumptionCriticality;
  load_bearing: boolean;
  rationale: string;
  failure_mode: FailureMode;
  gate_policy: GatePolicy;
}
```

Make dependency graph edges first-class instead of storing only decision IDs and a separate assumption dependency list:

```ts
type DependencyNodeType = 'assumption' | 'decision' | 'evidence' | 'protocol_record' | 'external_source';
type DependencyRelation =
  | 'depends_on'
  | 'supports'
  | 'derived_from'
  | 'contradicts'
  | 'supersedes'
  | 'gates'
  | 'affects';

interface DependencyEdge {
  id: string;
  from_id: string;
  from_type: DependencyNodeType;
  relation: DependencyRelation;
  to_id: string;
  to_type: DependencyNodeType;
  required_for_gate: boolean;
  strength: 'strong' | 'medium' | 'weak' | 'unknown';
  created_at: string;
}
```

Add a pre-action gate report that can be generated from entries and edges without executing any action:

```ts
type GateVerdict = 'pass' | 'warn' | 'block' | 'escalate';

interface AssumptionGateReport {
  action_id: string;
  generated_at: string;
  verdict: GateVerdict;
  load_bearing_assumptions: string[];
  unverified_blockers: string[];
  expired_blockers: string[];
  dependency_gaps: string[];
  required_escalations: string[];
}
```

The revised `AssumptionEntry` should contain `criticality: CriticalityMetadata`, `testability: TestabilityMetadata`, `dependencies: string[]` as edge IDs, lifecycle fields, and hash fields. `RegistrySnapshot` should contain `schema`, `system_id`, `assumptions`, and `dependency_edges`. Health metrics should add counts for load-bearing unverified assumptions, expired load-bearing assumptions, blocked gates, escalated gates, and unresolved dependency gaps.

# 5. PUBLIC FRAMING UPDATE
ARP-1.0 says: Clearpath traces what was decided; the Assumption Registry traces what was taken for granted. Keep that sentence, but extend the public framing for v2:

ARP-2.0 is the pre-action belief governance layer. It identifies which assumptions are load-bearing, records how each assumption can be tested, maps which decisions and protocol records depend on it, and blocks or escalates action when unresolved assumptions carry unacceptable risk.

Public copy should avoid presenting ARP as a generic confidence tracker. The stronger framing is: assumptions are infrastructure. Some are decorative, some are material, and some are load-bearing. ARP-2.0 is how an agent knows which beliefs must be tested before it acts.

The README should eventually update examples from `testable: true` and `test_method: "..."` to a structured `testability` object, and should show a pre-action gate report before a Clearpath decision or tool action is allowed to proceed.

# 6. CROSS-PROTOCOL RELATIONSHIPS
Clearpath remains the primary decision trace partner. ARP-2.0 should link assumption edges to Clearpath trace IDs and, where possible, specific Clearpath node IDs. Clearpath records what was decided and why; ARP records which load-bearing beliefs made that decision permissible.

Ethics Gate should consume ARP gate reports before high-impact actions. A blocked or escalated ARP report should become an Ethics Gate input, not an after-the-fact note.

Trust Score should count unresolved load-bearing assumptions as a negative trust signal, especially when the same agent repeatedly acts on unverified foundational assumptions.

Dispute Protocol should use ARP dependency edges to identify when two parties disagree because they inherited different assumptions, stale sources, or incompatible preconditions.

Harm Trace should link downstream harms back to failed assumptions when a decision's dependency graph shows that the invalidated assumption was load-bearing.

Cognitive Ledger can use ARP history to detect repeated reasoning patterns such as overconfident untested assumptions, stale temporal assumptions, or unsupported causal assumptions.

Consent Ledger and any action-authorization layer should treat the ARP pre-action gate as a sibling requirement: authorization says the agent may act; ARP says the belief state supporting the action is sufficiently governed.

# 7. IMPLEMENTATION SCOPE
Keep the implementation scope small and library-first. No server, database, UI, package rename, dependency expansion, or architecture rewrite is required for v2.

Minimum v2 implementation should include updated TypeScript types, registration input changes, deterministic migration from ARP-1.0 JSON snapshots, graph-edge persistence, gate-report generation, health metric updates, Markdown export updates, and focused tests for migration, testability metadata, dependency edge roundtrip, gate verdicts, and load-bearing health metrics.

Do not make external research citations executable dependencies. The schema should support provenance and verification metadata, but ARP should not fetch sources, run validators, call LLM judges, or execute tools itself. Other systems can perform those checks and write the result into ARP.

The first release can avoid static workflow verification, PROV-O export, and formal policy DSLs. Those are good future extensions once the core v2 schema is stable.

# 8. RECOMMENDATION one-line
Ship ARP-2.0 as a schema-focused pre-action gate upgrade: structured criticality, structured testability, first-class dependency edges, and gate reports, with no service architecture change.
