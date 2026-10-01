# V8-D — Resource & Capacity-Aware Autonomy

## Goal

V8-C decides **which work matters most**. V8-D decides **which of that selected work can safely fit inside the executive's current capacity**.

The boundary is:

```text
ACTIVE OBJECTIVES
      ↓
V8-C WORK ARBITRATION
      ↓
BOUNDED CANDIDATE WORKSET
      ↓
V8-D CAPACITY GATE
      ├── agent capacity
      ├── tool capacity
      ├── concurrency capacity
      └── other declared resources
      ↓
EXECUTABLE SET
      ↓
SAFETY / APPROVAL
      ↓
V6 EXECUTION
```

## Design rules

1. Capacity gating happens **after V8-C arbitration** and never replaces prioritization.
2. Capacity decisions are deterministic: candidates are evaluated in V8-C order.
3. A candidate must fit every declared resource requirement before it is admitted.
4. Existing resource usage counts against available capacity.
5. Unknown resources are rejected rather than implicitly created.
6. Capacity gating only restricts executive work selection; it never executes work or grants authority.
7. V6 remains the execution authority downstream.

## Capacity model

`ExecutiveCapacityGate` accepts resources with:

- `id` — stable resource identity, such as `agent:research` or `tool:web`.
- `limit` — maximum concurrent units.
- `inUse` — currently occupied units.

A candidate declares resource requirements as `(resourceId, units)` pairs. Requirements for the same resource are aggregated before admission.

The gate returns:

- `selected` — work that fits the available capacity.
- `rejected` — work that does not fit.
- `capacity` — remaining capacity after reservations.
- `evidence` — selected/rejected IDs and deterministic rejection reasons.

## V8-C relationship

V8-C remains responsible for urgency, intervention signal, objective priority, progress, creation time, and stable ID tie-breaking. V8-D does not re-rank those candidates. It preserves that order and applies capacity constraints to the bounded set.

This prevents capacity pressure from silently becoming a second, opaque prioritization system.

## Non-goals

V8-D does not:

- execute agents or tools;
- acquire credentials;
- bypass founder approval;
- replace V6 scheduling/runtime/execution truth;
- introduce unbounded parallelism;
- infer capacity from opaque model output.

## Proof target

The V8-D demo must show that selected work is constrained by agent, tool, and concurrency limits, that unavailable resources reject work before planning, and that the gate itself creates no execution authority.
