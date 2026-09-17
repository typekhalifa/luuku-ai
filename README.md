# Luuku AI

Luuku AI is a Rwanda-based AI systems architecture company building an internal AI Operating System for autonomous business workflows, then productizing the proven architecture for other organizations.

> **We are not building another chatbot. We are building the operating layer through which an AI-native company can observe, decide, coordinate, execute, learn and communicate.**

## Current repository model

~~~text
E:\luuku-ai
├── luuku-ai\
│   └── Backend / AI Operating System
│
└── apps\
    ├── mission-control\
    │   └── Internal company dashboard / cockpit
    │
    └── web-new\
        └── Public Luuku AI website
~~~

## Current engineering baseline

**Package version:** v0.10.0 — Autonomous Architecture Baseline

The package version is separate from the historical strategic roadmap.

The current backend contains substantial V6-V8 executive and execution infrastructure, including durable execution, autonomous work selection, prioritization, capacity, resource economics, tradeoffs, learning, strategy evolution, company-state observation, adaptive intervention, long-horizon planning, institutional memory, exception management and autonomous-loop orchestration.

## Current architecture

~~~text
External Channels / Mission Control
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
      Agents / Capabilities
              ↓
       Queue / Runtime
              ↓
      Real-world actuators
              ↓
       External outcomes
              ↓
 Events / Evidence / Memory / Learning
              ↓
          Observation
~~~

### Execution authority

**V6 remains the execution authority.**

V7/V8 layers can observe, reason, prioritize, plan, adapt, manage exceptions and orchestrate, but they do not create a second execution authority.

This boundary is fundamental to the architecture.

## Existing backend capabilities

### Executive system
- Executive AI
- Executive Assistant
- objective-driven cycles
- company-state observation
- autonomous work selection
- prioritization
- capacity and resource gates
- economic tradeoffs
- learning and strategy evolution
- long-horizon planning
- institutional memory
- exception management
- autonomous company loop
- durable execution/recovery

### Agent system
Current implementation areas include:
- Executive AI
- Executive Assistant
- Research
- Sales
- Business workflows
- Communication / Voice
- Dashboard / Executive Dashboard
- CRM, workflow and test agents

The architecture is extensible; new departments should be added when real workflows require them rather than simply increasing agent count.

### Knowledge system
The repository contains foundations for:
- knowledge assets
- document loading/parsing
- chunking
- embeddings
- vector storage
- retrieval
- context construction
- AI providers
- conversation infrastructure
- memory
- capability/tool registration

### Communication
The communication layer is provider-neutral and includes:
- messages
- conversations
- events
- execution records
- channel adapters
- Discord infrastructure
- Resend email integration
- voice architecture

WhatsApp, Slack and Telegram remain integration targets.

### CRM and persistence
The backend contains company, contact, deal, activity, workflow, queue and executive persistence models through Prisma/PostgreSQL.

## Validation

Known local validation during the V8 build includes:
- Prisma client generation — PASS
- backend typecheck — PASS
- V8-K long-horizon planning — PASS
- V8-M exception management — PASS
- V8-O durable execution/recovery — PASS

V8-N has been hardened and remains a validation gate before being treated as release-complete.

The repository also contains a GitHub Actions V8 validation workflow covering backend typecheck and V8-K through V8-O demos.

## Strategic evolution

The original product roadmap was:

~~~text
v1 Mission Control
v2 AI Core / Knowledge
v3 Multi-Agent Collaboration
v4 Company Operating System
v5 Communication Layer
v6 Autonomous Business
v7 Luuku OS
~~~

That remains useful as historical/product evolution.

The implementation has since expanded the internal architecture beyond those labels into explicit V6/V7/V7.9/V8 execution, governance and autonomy layers.

## Next major phases

~~~text
CURRENT
Architecture audit + documentation reconciliation
        ↓
V8 hardening + complete validation
        ↓
Production security / tenancy / deployment / monitoring
        ↓
REAL-WORLD ACTUATORS
Sales / CRM / Email / Discord / Voice / WhatsApp
        ↓
Continuous internal Luuku OS operation
        ↓
PRODUCTIZATION
Luuku AI OS → customer autonomous systems
~~~

## Development principles

- Preserve V6 as the sole execution authority.
- Prefer composition over duplicated infrastructure.
- Agents use shared platform services.
- Communication channels remain adapters.
- External execution must be distinguished from simulation/drafting.
- Preserve idempotency and reality-integrity evidence.
- Keep human approval available for consequential actions.
- Prove behavior with deterministic demos before productionizing.
- Update documentation whenever canonical architecture changes.

See:
- ARCHITECTURE.md
- ROADMAP.md
- docs/ARCHITECTURE-AUDIT.md
- docs/DEVELOPMENT-AND-VALIDATION.md

**Repository:** typekhalifa/luuku-ai
