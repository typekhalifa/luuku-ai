# V6 Actuation Boundary

## Purpose

The V6 Actuation Boundary is the final dispatch boundary between Luuku's executive architecture and real agent execution.

V8 can observe company state, select and prioritize work, plan, manage exceptions, learn, remember, and evolve strategy. It must not directly dispatch external side effects.

The supported execution path is:

```text
Lex / V8 executive layers
        ↓
Execution Decision
        ↓
Durable Executive Submission
        ↓
V6 Workflow
        ↓
V6 Actuation Boundary
        ↓
Agent Runner
        ↓
Capability / Provider Adapter
        ↓
External world
        ↓
Provider evidence + verified execution
        ↓
Durable execution ledger / memory
```

## Boundary guarantees

A dispatch is accepted only when the workflow step has:

- a durable workflow identity;
- a step identity;
- an explicit agent identity;
- an explicit capability;
- no unresolved step-level approval requirement;
- a `READY` or `RUNNING` workflow-step state.

The boundary does **not** grant approval, create work, choose a capability, or call providers itself. It validates execution identity and delegates to the existing V6 executor.

## Durable execution

The actuation boundary sits after the durable execution ledger claim. An existing completed execution is recovered rather than dispatched again. An unresolved `executing` record is blocked pending reconciliation.

Provider-facing agents remain responsible for returning execution evidence and verified reality. CRM mutations must continue to require verified real execution.

## Validation

Run:

```bash
npx tsx luuku-ai/orchestration/execution/demo/v6-actuation-boundary-demo.ts
```

The validation covers valid dispatch, missing capability, approval bypass, and invalid workflow state.
