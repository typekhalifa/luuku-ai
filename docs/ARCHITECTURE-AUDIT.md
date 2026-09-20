# Luuku AI Architecture Audit

**Audit scope:** feat/v8  
**Audit date:** 2026-09-18

## Repository boundaries

~~~text
E:\luuku-ai
├── luuku-ai\   # backend / internal AI Operating System
└── apps\       # frontend applications
    ├── mission-control\  # internal operational dashboard
    └── web-new\          # public Luuku AI website
~~~

Historical v1-v7 milestones remain useful as product history. This audit records the newer V6-V8 implementation layers that now exist.

## Backend capability map

| Area | Current evidence | State |
|---|---|---|
| Executive AI | executive agents, observation, intent, policy, objective cycle | Implemented |
| V6 execution | workflow, queue, runtime, execution ledger | Implemented |
| V7/V7.9 governance | autonomy policy, approval/safety boundaries | Implemented |
| V8-A-H | continuous life through strategy evolution | Implemented |
| V8-I | company-state observation | PASS |
| V8-J | adaptive intervention | PASS |
| V8-K | long-horizon planning | PASS |
| V8-L | institutional memory + projection | LOCKED |
| V8-M | exception management | PASS |
| V8-N | autonomous company loop | Hardened; validation remains a release gate |
| V8-O | durable execution/recovery | PASS from local validation |
| Agents | Executive, EA, Research, Sales, Business, Voice, communication and test agents | Mixed: implemented + extensible |
| Knowledge | loaders, parsers, chunking, embeddings, vector store, retrieval, context, providers | Implemented foundation; production depth varies |
| Communication | provider-neutral core, adapters, Discord, Resend email, voice architecture | Mixed: real paths exist; activation varies |
| CRM | companies, contacts, deals, activities and workflows | Implemented |
| Persistence | PostgreSQL/Prisma models for company, communication, workflow, queue and executive state | Implemented |
| Frontend | Mission Control + public web application | Implemented applications; integration/deployment hardening remains |

## Architectural spine

~~~text
External channels / Mission Control
              ↓
       Communication Core
              ↓
        Executive Brain
              ↓
 Observation → Objectives → Prioritization
              ↓
 Capacity → Economics → Strategy
              ↓
            Planning
              ↓
      Exception Management
              ↓
      Autonomous Company Loop
              ↓
   Durable Execution / Recovery
              ↓
        V6 Execution Authority
              ↓
   Agents / Capabilities / Runtime
              ↓
     Real-world actuators
              ↓
        Events / Evidence
              ↓
 Memory / Institutional Memory / Learning
              ↓
          Observation
~~~

**Authority rule:** V8 orchestrates and governs; V6 remains the execution authority. No new actuator may create a competing execution authority.

## Communication and actuator findings

The repository already has a provider-neutral communication contract and concrete communication infrastructure. The next actuator phase is therefore an integration and hardening effort, not a greenfield communication rewrite.

Current evidence includes Discord adapter/gateway infrastructure, a Resend email adapter with explicit live-execution controls, voice agent/execution architecture, Sales workflows referencing email and voice, and persisted communication execution records with execution/verification/evidence/idempotency fields.

WhatsApp, Slack and Telegram remain adapter targets rather than completed production channels.

## Frontend findings

### Mission Control

Mission Control is the internal dashboard/cockpit. It contains SDK, API, runtime, planner, workflow, registry, agents, events, CRM and dashboard-related code.

Immediate integration issue: its API service currently defaults to a hard-coded http://localhost:3000/api/v1. Production configuration should be environment-driven.

Its README is still the stock Vite template and should be replaced with Luuku-specific development/deployment documentation.

### web-new

apps/web-new is a Next.js public website and is separate from Mission Control.

Its README is still the stock Next.js template and should be replaced with Luuku-specific instructions.

The root package scripts currently reference apps/web for dev:web and build:web, while the current public application identified by the repository structure is apps/web-new. This must be reconciled before treating the web deployment path as canonical.

## Documentation findings

The root README, ARCHITECTURE and ROADMAP still describe V5/V6/V7 as the current progression and do not reflect V8-I through V8-O.

This is documentation drift, not evidence that the implemented V8 layers are absent.

Documentation should distinguish:
1. historical roadmap milestones,
2. current engineering architecture,
3. production readiness,
4. future productization.

## Validation baseline

Known local evidence from the current build:
- backend TypeScript typecheck: PASS;
- Prisma client generation: PASS;
- V8-K validation: PASS;
- V8-M validation: PASS;
- V8-O validation: PASS;
- V8-N has been hardened, but should remain a release gate until its latest branch state is locally/CI validated.

The V8 validation workflow runs backend typecheck plus V8-K, V8-L, V8-L projection, V8-M, V8-N and V8-O demos.

## Important technical risks before production

1. V8-N approval scope can currently be global to a cycle; approval requirements should eventually be scoped to the affected intent/work item.
2. Production composition must inject durable stores rather than rely on in-memory defaults.
3. Every external actuator needs provider evidence, idempotency, failure semantics and reality-integrity checks.
4. Authentication, authorization, secret handling, tenant isolation and least-privilege capability access are not yet the finished production layer.
5. The full executive-to-actuator lifecycle needs production-grade metrics, logs, tracing and alerting.
6. Frontend API endpoints and deployment configuration must be environment-driven.
7. Stale roadmaps/readmes can cause future engineers to rebuild already-existing infrastructure.

## Build order after the audit

~~~text
Audit / reconcile docs
        ↓
Harden V8-N + full validation
        ↓
Production security / tenancy / observability foundations
        ↓
Actuator contract + reality-integrity hardening
        ↓
CRM + Sales
        ↓
Email
        ↓
Discord operational path
        ↓
Voice
        ↓
WhatsApp
        ↓
Production deployment
        ↓
Internal Luuku OS running continuously
        ↓
Productize into customer autonomous systems
~~~

The finish line is not "many agents." It is a company operating loop that can receive objectives, observe reality, choose and coordinate work, execute bounded actions through V6, learn from verified outcomes, recover from failures, and escalate decisions that require the founder.

## Production security hardening — 2026-09-20

Mission Control now has an explicit browser authentication boundary:

- Users are stored with scrypt password hashes; plaintext passwords are never persisted.
- Browser sessions use random opaque tokens stored only as SHA-256 hashes in the database.
- Sessions are delivered through an HttpOnly, SameSite cookie and are Secure in production.
- Session authentication resolves the requested company through a durable company membership; browser-supplied tenant IDs are accepted only as a selector and must match an existing membership.
- Membership roles are OWNER, ADMIN, OPERATOR and VIEWER.
- Route permissions distinguish read, operate and admin access.
- Service-to-service API keys remain supported, but are bound to the configured company and represented as SERVICE scope rather than browser identity.
- Login attempts are throttled per source address.
- Global event/workflow/runtime observability that is not yet durably tenant-scoped fails closed for browser sessions rather than exposing cross-company state.
- Communication observability is tenant-scoped and requires durable company ownership.
- Communication idempotency reuse now rejects cross-tenant collisions.
- Tenant-safe CRM writes and resource ownership checks remain in force.
- Production secrets remain environment-injected; real credentials must never be committed.

Bootstrap a first internal owner with the environment variables in `.env.example` and `npm run dev:auth:bootstrap`. The bootstrap operation is intentionally create-once and fails if the user already exists.

### Security boundary still required before external multi-tenant launch

- A production deployment should use a managed secret store rather than ad-hoc host environment editing.
- Session cleanup/revocation operations should be exposed through an authenticated administrative control path.
- Durable tenant ownership should be added to workflow/event telemetry before browser access to those global stores is reopened.
- Complete automated cross-tenant authorization tests should cover every future write and every new resource endpoint.
