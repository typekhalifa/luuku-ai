# V8-F — Autonomous Tradeoff & Decision Economics

## Purpose

V8-F evaluates whether candidate work creates enough expected objective value to justify its resource cost and operational risk.

## Decision model

For each candidate:

`netScore = objectiveValue + urgency + strategicImpact - resourceCost - risk`

Decisions are deterministic:

- `SELECT` — net score is above the minimum threshold.
- `DEFER` — net score is exactly at the threshold and therefore marginal.
- `REJECT` — net score is below the threshold.

## Boundary

V8-F is a decision layer only. It does not create workflows, invoke tools, approve unsafe actions, or execute work. Downstream safety/policy gates remain authoritative, and V6 remains the execution authority.

## V8 progression

V8-C chooses what matters most.
V8-D determines what can be supported with available capacity.
V8-E determines what can be afforded with available budget.
V8-F evaluates the economic tradeoff between value, cost, urgency, strategic impact, and risk.

The resulting decision can feed a later execution path, but V8-F itself never executes.
