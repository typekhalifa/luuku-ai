# V8-E — Autonomous Resource Budget & Tradeoffs

## Purpose

V8-E adds a resource-budget boundary after V8-C prioritization and V8-D capacity admission. It lets the executive decide whether already-prioritized work should consume scarce budget now, be deferred, or be denied because the required resource is unavailable.

## Ordering

```text
OBJECTIVES
    ↓
V8-C PRIORITIZATION
    ↓
V8-D CAPACITY
    ↓
V8-E RESOURCE BUDGET
    ↓
SAFETY / POLICY
    ↓
V6 EXECUTION
```

V8-E does not rerank work and does not execute actions. It consumes the ordered V8-C/V8-D workset and allocates available budget in that order. This preserves the executive's priority decision while making resource tradeoffs explicit.

## Decisions

- `ALLOCATE` — required resources fit within remaining budget.
- `DEFER` — the resource exists but the current budget is insufficient.
- `DENY` — a required resource is unavailable or the requirement is invalid.

Existing spend is accounted for before allocation. Every decision contains an explicit reason, and the aggregate result exposes remaining resources and audit evidence.

## Authority boundary

V8-E only decides resource allocation. It cannot submit, schedule, claim, or execute a workflow. Admitted work continues through the existing safety/policy boundary and V6 runtime, which remains the execution authority.

## Validation

The V8-E demo verifies existing spend, ordered allocation, budget exhaustion, unavailable resources, deterministic decisions, and preservation of the V6 execution boundary.
