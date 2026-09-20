# Luuku AI Development & Validation Guide

## Repository model

- Backend / AI Operating System: luuku-ai/
- Internal dashboard: apps/mission-control/
- Public website: apps/web-new/

Work on the backend must preserve V6 execution authority and V8 governance boundaries.

## Local baseline

From the repository root:

~~~powershell
npm ci
npx prisma generate
npm run typecheck:backend
~~~

## V8 validation

~~~powershell
npx tsx luuku-ai/os/executive/demo/v8-k-long-horizon-planning-demo.ts
npx tsx luuku-ai/os/executive/demo/v8-l-institutional-memory-demo.ts
npx tsx luuku-ai/os/executive/demo/v8-l-memory-projection-demo.ts
npx tsx luuku-ai/os/executive/demo/v8-m-exception-management-demo.ts
npx tsx luuku-ai/os/executive/demo/v8-n-autonomous-company-loop-demo.ts
npx tsx luuku-ai/os/executive/demo/v8-o-durable-execution-demo.ts
~~~

The GitHub Actions workflow .github/workflows/v8-validation.yml runs the backend typecheck and these V8 validation gates.

## Rules for safe changes

1. Do not create a second execution authority.
2. Do not let an actuator bypass policy, approval, capacity, budget, economic or safety boundaries.
3. Do not treat drafts or simulations as real-world execution.
4. External execution must return verifiable evidence where the provider supports it.
5. Preserve idempotency for externally observable actions.
6. Prefer existing shared services/contracts over agent-specific integrations.
7. Update documentation when a canonical architecture or boundary changes.
8. Do not reset unrelated working-tree changes while debugging.

## Debugging order

1. Read the failing demo assertion.
2. Inspect the implementation contract it tests.
3. Determine whether the failure is implementation, test expectation, environment or generated-client state.
4. Run the narrowest local reproduction.
5. Typecheck the backend.
6. Re-run the affected demo.
7. Run the complete V8 validation sequence.
8. Only then update architecture/status documentation.

## Reality integrity

~~~text
prepared ≠ queued ≠ attempted ≠ executed ≠ verified
~~~

A successful internal function call is not automatically proof that the external world changed.

## Latest V8 validation evidence

The latest local validation completed without failures:

- Backend typecheck — PASS
- V8-K Long-Horizon Planning — PASS
- V8-L Institutional Company Memory — PASS
- V8-L Executive-to-Institutional Memory Projection — PASS
- V8-M Exception Management — PASS
- V8-N Autonomous Company Loop — PASS
- V8-O Durable Execution & Recovery — PASS
- V6 Actuation Boundary — PASS
- Production Actuator Composition — PASS
- V8 End-to-End Actuation / exactly-once — PASS
- Controlled real-email actuation — PASS in Resend test mode

The controlled real-email validation used an explicit CRM test fixture, verified recipient identity, confidence 100, explicit live confirmation, the production actuator composition, the V6 execution boundary, the Communication Router and Resend provider evidence. The provider returned verified execution evidence and the controlled message was received. This does not represent unrestricted production email sending.

The current architectural rule remains: V8 orchestrates and governs; V6 remains the sole execution authority.

## API security baseline

The API now applies a small fail-closed security baseline without introducing a browser-held secret:

- Production startup requires LUUKU_API_KEY.
- Protected API routes require the x-luuku-api-key header when the server key is configured.
- API key comparison uses a length check plus constant-time comparison.
- Resend's webhook route remains outside the API-key gate because it has its own Svix signature verification.
- CORS is explicit in production through CORS_ORIGINS; no-origin configuration is fail-closed.
- Each response receives an x-request-id for correlation; a caller-supplied request ID is preserved when present.
- Basic browser/security headers are applied centrally.
- JSON request bodies remain capped at 1 MB.

The API key is intentionally not exposed to Mission Control's browser bundle. A production browser client must use an authenticated session/token boundary or an authenticated same-origin gateway; adding VITE_LUUKU_API_KEY would move a server secret into the browser and is therefore not an acceptable production solution.

## Production readiness gate

Before calling Luuku's autonomous loop production-ready, verify durable stores, secrets, authentication, authorization, tenant boundaries, explicit actuator permissions, idempotency, provider evidence, bounded retries/recovery, monitoring, alerts, reliable founder approval/escalation, environment-driven frontend/backend configuration and representative end-to-end workflows.

## Tenant-bound API hardening

The authenticated API request context now carries the configured company ID and CRM overview reads are scoped to that tenant. CRM company/contact/deal/activity repositories also support tenant-bound resource reads and writes, including ownership checks before update/delete and tenant checks on creates.

The prospect-registration workflow is tenant-bound when invoked through the authenticated application context: it must resolve the authenticated company and cannot create a new company for that request. This prevents a browser/API caller from selecting an arbitrary company ID or creating records under another tenant through the prospect workflow.

This is an incremental boundary, not full multi-tenant authorization yet. Internal non-HTTP callers may still use the legacy unscoped service methods, and dashboard communication/event observability remains subject to a separate tenant-scope review. Production browser authentication/session authorization and a complete cross-tenant isolation test remain required before production readiness.


### Tenant isolation regression validation

When a database is available, run:

~~~powershell
npm run dev:tenant-isolation
~~~

The regression demo provisions two temporary companies and representative CRM records, verifies tenant-scoped list and ID reads, verifies cross-tenant update/delete protection, verifies tenant-bound creates, and cleans up its fixtures in a finally block.

The demo is intentionally separate from the CI V8 suite until the workflow has an explicit disposable database service and migration/bootstrap step. Do not interpret the existence of the demo as CI evidence.

### Agent and runtime tenant authorization

- Sales CRM execution now requires `task.metadata.companyId` and fails closed with `TENANT_CONTEXT_REQUIRED` when absent.
- Task/company/contact resolution is bound to the authenticated tenant company instead of resolving across the entire CRM.
- CRM prioritization reads and mutations are tenant-scoped.
- Internal enrichment carries the tenant context into prospect registration.
- Mission Control dashboard communication telemetry fails closed to an empty snapshot until communication records have durable company ownership.
- A CI regression demo verifies the Sales agent cannot execute CRM work without tenant context.
- Global communication observability must not be re-enabled until the communication schema and persistence path are tenant-scoped end to end.
