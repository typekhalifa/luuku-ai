# V8-A — Autonomous Executive Continuity

## Purpose

V8-A establishes the process-level continuity boundary for the autonomous executive. The executive can start a persistent service, initiate its own first cycle, continue on scheduled intervals, recover from an individual cycle failure, prevent overlapping cycles, and stop cleanly.

## Boundary

```text
Persistent Executive Service
        ↓
Persistent Executive Loop
        ↓
Autonomous Executive Cycle
        ↓
Observation → Intent → Plan → Policy → Decision
        ↓
Submission / Continuation
        ↓
V6 Execution Authority
        ↓
Outcome / Memory
        ↓
Next autonomous cycle
```

The service owns process lifecycle and scheduling. The persistent loop owns repeated executive cycles and checkpoint handling. The executive cycle owns executive reasoning and delegates execution downstream. V6 remains the execution authority.

## Continuity guarantees

- `start()` initiates autonomous operation; callers do not need to invoke `runOnce()`.
- The service can run the first cycle immediately and schedule subsequent cycles.
- An active cycle is deduplicated so interval ticks cannot overlap it.
- A cycle failure is surfaced through `onError` without stopping the service.
- `stop()` clears the timer, waits for an active cycle, and prevents later cycles.

## Demo

Run:

```powershell
npx tsx luuku-ai/os/executive/demo/v8a-autonomous-continuity-demo.ts
```

The demo deliberately makes the first autonomous cycle fail. It then verifies that later cycles execute, that concurrency never exceeds one, and that shutdown prevents further cycles.

This milestone proves **autonomous continuity**, not the complete autonomous-company behavior targeted by later V8 stages.
