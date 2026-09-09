# V8-G — Autonomous Learning & Adaptation

## Purpose

V8-G closes the feedback loop between durable executive memory and future economic decisions. Historical success and failure become bounded, deterministic evidence that can adjust a future tradeoff candidate before V8-F evaluates it.

## Adaptation rules

- No relevant learning: preserve the original economic estimate.
- `SUCCESS_PATTERN`: increase objective value by a bounded +5 signal.
- `FAILURE_PATTERN`: increase economic risk by +10.
- `REPEATED_FAILURE`: increase economic risk by +20.

The adaptation never executes work, changes V6 state directly, grants approval, or bypasses policy and safety.

## Executive path

`V8-C arbitration -> V8-D capacity -> V8-E budget -> V8-G learning adaptation -> V8-F tradeoff -> policy/safety -> planning/submission -> V6 execution -> durable outcome -> memory`

## Boundary

V8-G changes decision evidence, not execution authority. V6 remains the execution authority and durable workflow/runtime boundary.
