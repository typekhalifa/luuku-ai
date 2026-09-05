# Luuku OS Executive Architecture

## Purpose

This document defines the canonical architecture of the Luuku OS executive layer after the V7.8 executive capability series. It is a consolidation contract, not a new execution engine.

The executive layer decides **what should happen and why**. The V6 runtime remains the authority for **how work is durably executed**.

## Canonical Executive Lifecycle

```text
Wake / External Event / Heartbeat
                |
                v
        Executive Observation
                |
                v
        Objective Assessment
                |
       +--------+---------+
       |        |         |
       v        v         v
   Priority   Urgency   Progress
       |        |         |
       +--------+---------+
                |
                v
          Objective Selection
                |
                v
      Intervention Assessment
                |
                v
       Memory / Learning
                |
                v
      Strategy / Adaptation
                |
                v
             Intent
                |
                v
              Plan
                |
                v
        Autonomy / Policy
                |
                v
            Decision
                |
                v
          Submission
                |
                v
        V6 Runtime Authority
                |
                v
             Outcome
                |
                v
       Feedback + Executive Memory
                |
                +---------------------> next wake/cycle
```

## Ownership Boundaries

### Executive layer owns

- observation and executive state projection
- objective assessment
- priority and urgency
- progress-trend interpretation
- intervention selection
- memory and learning interpretation
- strategic adaptation
- intent generation
- execution-plan construction
- autonomy-policy evaluation
- execution eligibility decisions
- executive feedback interpretation

### V6 execution layer owns

- durable workflows
- queue state
- scheduling
- claiming and concurrency safety
- retries and backoff
- failure classification
- reconciliation of uncertain execution
- multi-agent coordination
- execution truth
- runtime recovery

The executive must not bypass V6 to perform operational work.

### Governance owns

- authorization
- founder approval
- safety gates
- consequential-action restrictions
- escalation

Approval makes an action eligible; it does not itself execute the action.

### Integration layer owns

- provider-specific API calls
- communication channels
- CRM and external systems
- provider authentication
- provider-specific delivery/verification details

Integrations remain adapters behind execution capabilities rather than executive business logic.

## Decision Hierarchy

When several executive signals disagree, the following hierarchy applies:

1. **Governance constraints** — safety, authorization, and approval requirements can block execution.
2. **Execution truth** — V6 state determines what is already running, completed, failed, blocked, reconciled, or escalated.
3. **Objective selection** — urgency, progress intervention, priority, and deterministic tie-breakers select the work to consider.
4. **Intervention** — objective condition determines whether to investigate, recover, intervene, or take no action.
5. **Memory-aware strategy** — historical experience can change the approach without changing governance authority.
6. **Capacity** — available execution capacity can defer otherwise eligible work.
7. **Intent and plan** — translate the selected executive decision into executable work.
8. **Autonomy policy** — determines whether the plan may proceed autonomously or requires founder approval.
9. **Submission** — creates durable V6 work; submission is not execution.

A lower layer must not silently override a higher-order constraint.

## State Model

The executive should treat the following as distinct concepts:

```text
Durable operational truth
  - Workflow
  - WorkflowStep
  - QueueItem

Executive projection
  - ExecutiveState
  - ExecutiveObservation
  - ExecutiveFeedback

Executive intent
  - ExecutiveIntent
  - ExecutionPlan
  - ExecutionDecision

Executive reasoning
  - ObjectiveAssessment
  - ObjectiveUrgencyScore
  - ObjectiveProgressTrendScore
  - ObjectiveIntervention
  - StrategicPlan / StrategicObjective
  - ExecutiveLearningRecord
  - MemoryAwareStrategyDecision
  - AdaptiveInterventionDecision

Executive continuity
  - ExecutiveLoopCheckpoint
  - ExecutiveEventInbox
  - ExecutiveMemory
```

Operational state is authoritative; executive state is a decision-making projection of that truth.

## Persistence Composition

Production composition should inject durable implementations through interfaces:

```text
                 Executive Domain
                       |
        +--------------+---------------+
        |              |               |
        v              v               v
 ObjectiveStore   MemoryStore    Checkpoint/Event Stores
        |              |               |
        +--------------+---------------+
                       |
                       v
                   PostgreSQL
```

In-memory stores remain valid for deterministic demos and tests. Production must explicitly compose durable stores.

## Required Invariants

1. No executive component directly performs an external side effect.
2. V6 remains the only execution authority.
3. Submission is distinct from execution.
4. Approval is distinct from execution.
5. Execution outcomes feed executive memory idempotently.
6. Memory is scoped to objectives/workflows when evidence permits.
7. Governance can block otherwise attractive executive actions.
8. Runtime truth wins over stale executive projections.
9. Every autonomous action should be explainable through its objective, intent, plan, policy, decision, and execution outcome.
10. Deterministic tie-breakers must prevent non-reproducible executive choices.

## Consolidation Gaps

The following are intentionally tracked as integration work rather than hidden behind the architectural diagram:

- Strategic planning exists as a capability but must be explicitly integrated into the canonical objective-driven cycle where strategic dependencies/conflicts materially affect selection.
- Resource/capacity intelligence exists as a gate but needs an explicit place in the canonical decision path before production composition relies on it.
- Durable executive memory exists through `PrismaExecutiveMemoryStore`, but production composition must inject it rather than relying on the in-memory default.
- Observability/evaluation must capture the complete lifecycle defined above before production deployment.
- Safety hardening must enforce the governance boundary at the final execution edge.

These gaps are deliberate consolidation targets; they are not reasons to duplicate existing capabilities.

## Architectural Principle

> The executive decides, governance constrains, V6 executes, integrations act on the outside world, and memory closes the learning loop.
