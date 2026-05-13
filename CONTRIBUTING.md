# Contributing to CLP

Thank you for contributing to the Cognitive Ledger Protocol (CLP). This document explains how to submit entries and how the protocol operates within the trust stack.

## Submitting a New CLP Entry

CLP entries (formerly known as ARP entries) are the primary mechanism for declaring assumptions and reasoning steps in the Omega reasoning infrastructure. To submit a new entry:

1.  **Instantiate the Registry**: Use the `AssumptionRegistry` class.
2.  **Prepare the Entry**: Define the statement, basis, and criticality.
3.  **Add Reasoning**: Include `reasoning_steps` for transparency.
4.  **Certify**: Provide a `faithfulness_certification` to attest to the reasoning's integrity.
5.  **Register**: Call `registry.register(entry)`.

```typescript
const entry = registry.register({
  agent_id: 'agent-001',
  category: 'world_model',
  statement: 'The sun will rise tomorrow.',
  basis: 'Inductive reasoning based on historical data.',
  criticality: 'load_bearing',
  confidence: 1.0,
  reasoning_steps: [
    {
      step_number: 1,
      thought: 'Observe historical sunrise patterns.',
      evidence_links: ['https://example.com/sunrise-data'],
      confidence: 1.0
    }
  ],
  faithfulness_certification: {
    certified: true,
    certified_by: 'omega-validator',
    certification_timestamp: new Date().toISOString(),
    rationale: 'Reasoning follows established logical patterns.'
  },
  domain: 'general'
});
```

## CLP-2.0 Required Fields

The CLP-2.0 schema requires the following fields for high-integrity reasoning:

-   `agent_id`: The unique identifier of the agent making the assumption.
-   `category`: One of the predefined `AssumptionCategory` types (e.g., `world_model`, `causal`).
-   `statement`: A clear, plain-language declaration of the assumption.
-   `basis`: The underlying rationale or source for the assumption.
-   `criticality`: `load_bearing` (blocks action if unverified) or `peripheral`.
-   `confidence`: A numerical value (0.0 to 1.0) representing the agent's certainty.
-   `reasoning_steps`: (CLP-2.0) An array of `ReasoningStep` objects:
    -   `step_number`: Integer index of the step.
    -   `thought`: The internal reasoning or logic used.
    -   `evidence_links`: URLs or IDs to supporting evidence.
    -   `confidence`: Step-specific confidence score.
-   `faithfulness_certification`: (CLP-2.0) Attestation of the reasoning process:
    -   `certified`: Boolean indicating if the reasoning is faithful to the model's internal state.
    -   `certified_by`: Identity of the certifier (agent or validator).
    -   `certification_timestamp`: ISO 8601 timestamp.
    -   `rationale`: Explanation for the certification.

## verifyChain Dual-Mode (v1/v2)

The `verifyChain` method ensures the cryptographic integrity of the assumption registry. It supports three modes:

-   `v1`: Verifies the chain using ARP-1.0 legacy payload format (id, timestamp, statement, etc.).
-   `v2`: Verifies the chain using the enhanced CLP-2.0 payload format, which includes `reasoning_steps` and `faithfulness_certification` in the hash calculation.
-   `dual`: (Default) Automatically detects the schema of each entry and applies the appropriate verification logic. This ensures that registries containing a mix of legacy and modern entries remain verifiable.

```typescript
// Perform dual-mode verification
const result = registry.verifyChain({ mode: 'dual' });
if (result.valid) {
  console.log(`Verified ${result.entries_checked} entries.`);
}
```

## CLP and Clearpath in the Trust Stack

CLP is a foundational layer in the Omega trust stack, working alongside Clearpath (CAP):

1.  **CLP (Cognitive Ledger Protocol)**: Traces the **assumptions** and **reasoning steps** that precede a decision. It answers "What did the agent believe?" and "How did it think?".
2.  **Clearpath (CAP)**: Traces the **decisions** and **actions** taken. It answers "What did the agent do?".

In the trust stack, CLP provides the "Why" and "Basis" for the "What" recorded by Clearpath. When an assumption in CLP is invalidated, the trust stack can instantly identify all dependent Clearpath decisions that are now compromised. This relationship allows for systemic auditability and automated gatekeeping (blocking actions when load-bearing assumptions are unverified).
