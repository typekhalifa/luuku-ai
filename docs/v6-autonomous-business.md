# V6 — Autonomous Business

> **Strategic goal:** move Luuku AI from founder-directed actions to coordinated, multi-step business workflows.

V6 does not mean adding a large number of agents at once. It means giving the company the coordination primitives required for agents to operate as a business.

## Core loop

```text
Business Event / Executive Goal
            ↓
      Executive AI
            ↓
          Planner
            ↓
       Workflow Plan
            ↓
       Orchestrator
            ↓
    Agent / Capability Registry
            ↓
       Queue / Runtime
            ↓
        Execution
            ↓
      Events / State / Logs
            ↓
      Executive AI
            ↓
 Founder decision only when required
```

## V6 principles

### 1. The founder owns decisions, not individual tasks

The founder should increasingly approve outcomes and consequential decisions rather than manually assigning every task.

### 2. Workflows are first-class objects

A business objective can produce a workflow containing multiple dependent steps. Each step identifies its responsible agent, capability, priority, inputs, and approval requirements.

### 3. Dependencies control execution

A step must not run until its required predecessor steps have completed. Independent steps may become runnable in parallel later when runtime infrastructure supports it.

### 4. Approval is explicit

A consequential workflow can pause in `AWAITING_APPROVAL`. Approval changes workflow state; it does not silently imply approval merely because a plan was generated.

### 5. Planning is separate from execution

The planner creates intent and structure. The orchestrator decides how work is routed. Runtime infrastructure executes it. Agents perform domain work. Communication reports results.

### 6. Agents are replaceable workers

Finance, Legal, Developer, HR, Support, Operations, Marketing, and other departments should be added as capabilities when real workflows require them. They should not contain orchestration logic that belongs to the platform.

## Current V6 foundation

The repository now contains workflow contracts for:

- workflow lifecycle state
- workflow steps
- agent ownership
- capability ownership
- dependency relationships
- priority
- step approval requirements
- step execution state
- workflow readiness evaluation

`WorkflowEngine` is intentionally pure. It decides which steps are runnable, waiting, or blocked; it does not execute agents, call external providers, or persist state.

Those responsibilities remain separated for the future Orchestrator, Queue, Runtime, and persistence layers.

## Example future workflow

```text
Goal: Onboard Company X

Research Agent
    ↓
Sales Agent → Proposal
    ↓
Founder approval
    ↓
Legal Agent → Contract
    ↓
Finance Agent → Invoice
    ↓
Developer Agent → Integration
    ↓
Support Agent → Onboarding
    ↓
Executive AI → Completion summary
```

The exact department sequence should be generated from the business objective and available capabilities rather than hardcoded into the company core.

## V6 implementation sequence

1. Workflow contracts and dependency model
2. Workflow persistence and state transitions
3. Planner that produces real multi-step plans
4. Orchestrator that routes plan steps to capabilities
5. Queue-backed execution and retry policy
6. Result/event propagation back to Executive AI
7. Approval checkpoints for consequential steps
8. First end-to-end autonomous business workflow
9. Add specialized departments as real workflows demand them
10. Harden observability, failure recovery, idempotency, and auditability

## V6 finish line

```text
Founder: "Onboard Company X."

Executive AI:
  "I created the plan. 5 steps are ready; 1 requires your approval."

Founder: "Approve."

Planner → Orchestrator → Queue → Runtime
        ↓
Research → Sales → Legal → Finance → Developer → Support
        ↓
Executive AI:
  "Onboarding complete."
```

The founder should not need to manually coordinate the individual departments.

---

**Strategic milestone:** v6.0 — Autonomous Business

**Engineering version remains:** v0.10.0
