# Phase 5 — Actuator Governance Contract

## Purpose

Phase 5 gives Luuku AI controlled hands in the external world without creating a second execution authority.

The existing path remains:

`V8 executive decision → V6 workflow execution → production actuator → provider → evidence`

The Phase 5 governance gate sits around the existing production actuator composition. It does not execute work itself.

## Contract

Every externally meaningful actuator dispatch must have:

1. **Explicit capability** — the action is identified by a machine-readable capability such as `email.send`.
2. **Explicit agent authorization** — the executing agent must be authorized for that capability.
3. **Operator control** — an actuator can be disabled immediately without changing the workflow or provider.
4. **Ownership-scoped idempotency** — the durable workflow + step identity is scoped by execution ownership.
5. **Execution evidence** — successful terminal actions retain provider/external evidence from the existing actuator result.
6. **Unknown-outcome safety** — if execution enters the provider boundary and the caller loses the response, the outcome is `UNKNOWN` and is never automatically replayed.

## Important boundary

The governance layer is not a new execution authority.

- V8 may decide and govern.
- V6 remains the sole execution authority.
- The governance gate may block, replay a previously completed action, or classify an uncertain provider result.
- Only the existing V6 → production actuator composition may perform the actual side effect.

## Phase 5.1 validation

The first Phase 5 attack validates:

- authorized action reaches the existing actuator;
- unauthorized agent is blocked;
- operator kill switch blocks the action;
- a completed action cannot execute twice;
- provider response loss is classified as unknown;
- unknown provider outcomes cannot be automatically retried.

This is intentionally provider-neutral. It does not activate unrestricted email, WhatsApp, voice, CRM, or other external providers.
