# V8-C — Autonomous Prioritization & Work Arbitration

## Purpose

V8-B proved that the executive can select multiple active objectives and turn each selected objective into an independently executable V6 workflow. V8-C adds a bounded arbitration layer for deciding **which work deserves attention first** when objectives compete for executive capacity.

## Boundary

V8-C remains an executive decision layer. It does not execute work, bypass approval, or replace V6 execution authority.

```text
Objective signals
      ↓
Urgency + progress + priority
      ↓
Deterministic arbitration
      ↓
Bounded objective selection
      ↓
V8-B planning / policy / submission
      ↓
V6 execution
```

## Arbitration dimensions

The selector considers the existing deterministic signals:

1. urgency score
2. progress intervention score
3. objective priority
4. progress
5. creation time
6. objective ID as a stable tie-breaker

## V8-C goals

- make competing objective selection explicit
- preserve deterministic decisions
- bound the number of selected objectives
- expose arbitration evidence
- keep objective selection separate from execution
- validate that V8-B receives only the selected work

## Non-goals

V8-C does not introduce:

- direct agent execution
- autonomous credential access
- approval bypass
- unbounded parallelism
- replacement of the V6 runtime
- opaque LLM-based priority decisions

## Acceptance criteria

A V8-C demo should prove that:

- multiple active objectives can compete for a bounded work-selection budget
- urgency and progress signals affect ranking
- priority and stable tie-breakers make selection deterministic
- the selection budget is enforced
- the selected set is auditable
- unselected objectives do not enter the executable V8-B path
- V6 remains the execution authority
