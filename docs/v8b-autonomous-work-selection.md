# V8-B — Autonomous Work Selection

## Purpose

V8-A established autonomous executive continuity: the executive service can start without an external cycle trigger, continue through repeated cycles, survive an individual cycle failure, and stop cleanly.

V8-B adds bounded autonomous work selection. A cycle can evaluate multiple active objectives, rank them deterministically, turn the selected objectives into executable plans, and pass multiple selected workflows to the existing V6 runtime authority.

## Flow

```text
OBSERVE
   ↓
ASSESS ACTIVE OBJECTIVES
   ↓
RANK / SELECT BOUNDED SET
   ↓
ADAPTIVE INTERVENTION
   ↓
INTENT
   ↓
PLAN
   ↓
POLICY / DECISION
   ↓
SUBMISSION
   ↓
V6 RUNTIME — one selected workflow at a time
   ↓
OUTCOME / MEMORY
```

## Safety properties

- Selection is bounded by `maxObjectiveSelections` and defaults to one for compatibility.
- Ranking remains deterministic using urgency, progress-trend intervention score, priority, progress, creation time, and objective ID.
- The executive does not gain a new execution authority. Selected workflows are still executed through the existing V6 autonomous runtime.
- Runtime execution is sequential within the executive cycle, avoiding an implicit parallel-execution contract.
- The demo uses a controlled in-memory agent and workflow stores; it does not call external providers.

## Acceptance criteria

- More than one active objective can be selected when explicitly configured.
- Selection order is deterministic.
- Each selected objective receives its own executable plan.
- Multiple selected workflows can be processed by one executive cycle.
- Each selected workflow reaches the V6 runtime path.
- V6 remains the execution authority.

## Demo

```powershell
npx tsx luuku-ai/os/executive/demo/v8b-autonomous-work-selection-demo.ts
```

Expected terminal conclusion:

```text
V8-B work selection: PASS
```
