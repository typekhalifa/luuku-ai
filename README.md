# Luuku AI

Luuku AI is a Rwanda-based AI systems architecture and consulting company focused on designing, building, and deploying practical AI systems for businesses, institutions, and the wider African ecosystem.

We are building Luuku AI from the inside out: first by creating our own internal AI Operating System, then by using those systems, workflows, and learnings to deliver AI solutions for clients.

---

## Vision

Build an AI Systems Architecture platform that enables businesses to operate through autonomous AI agents working together as a coordinated company.

Luuku AI is not being built around AI hype. It is being built around useful systems:

- AI workflow automation
- internal knowledge assistants
- AI copilots for operations and teams
- retrieval and knowledge systems
- AI infrastructure tailored to real operational workflows
- autonomous multi-agent execution

---

## Current Mission

Build and prove Luuku AI's internal AI Operating System before scaling the same architecture into client-facing systems.

The current codebase already contains the foundations for:

- **Executive Assistant** — founder planning, prioritization, and execution tracking
- **Executive AI** — executive-level coordination and decision support
- **Research Agent** — business research and AI opportunity discovery
- **Sales Agent** — sales workflow foundations
- **Voice Agent** — communication/voice foundation
- **Mission Control** — dashboards and operational visibility
- **Knowledge Layer** — document loading and embedding foundations
- **Orchestration Layer** — planning, routing, registry, task, and execution primitives
- **Collaboration Layer** — agent messaging and event-driven coordination
- **Organization Runtime** — queues, workers, runtime state, and monitoring

The goal is simple:

> If Luuku AI wants to build AI systems for other organizations, it should first build and test AI systems inside Luuku AI itself.

---

## Current Engineering Version

**v0.10.0 — Autonomous Architecture Baseline**

This version label is the canonical repository/package version. Strategic roadmap milestones such as **v5.0 — Communication Layer** are tracked separately in `ROADMAP.md`.

---

# Current System

## Agents

```text
luuku-ai/agents/
├── executive-ai/
├── executive-assistant/
├── research-agent/
├── sales-agent/
├── business/
├── communication/
│   └── voice/
├── dashboard/
├── executive-dashboard/
└── database / workflow / CRM test agents
```

The agent set is intentionally incomplete. New specialized agents will be added as the underlying company operating system matures.

## Core Architecture

```text
Founder / External Channel
          ↓
   Communication Layer
          ↓
     Executive AI
          ↓
       Planner
          ↓
        Router
          ↓
   Agent Registry
          ↓
    Orchestrator
          ↓
        Queue
          ↓
       Runtime
          ↓
      Execution
          ↓
   Events / State / Logs
          ↓
 Communication Layer
```

Shared infrastructure lives under `luuku-ai/shared/` and includes communication, AI providers, context, conversation, CRM, events, collaboration, organization state, runtime, scheduling, and other reusable services.

The orchestration layer lives under `luuku-ai/orchestration/` and contains planner, router, executor, registry, capability, and task primitives.

---

# Knowledge & AI Foundation

The repository includes foundations for:

- knowledge asset loading
- document parsing
- chunking and validation
- embedding generation
- shared AI/chat providers
- context and conversation infrastructure
- memory and organizational state
- tool/capability registration

These foundations continue to evolve toward the full AI Core described in the roadmap.

---

# Communication Direction

The next strategic milestone is **v5.0 — Communication Layer**.

The communication layer is being designed as a core system, not as a collection of unrelated chat integrations.

```text
Communication Core
        ↓
 Commands / Notifications / Approvals
        ↓
 Orchestrator / Agents / Runtime
        ↓
 Results / Events / State
        ↓
 Communication Core
```

Initial channel targets include WhatsApp, Discord, Slack, Telegram, and voice. Channel adapters should remain replaceable while the communication core owns message, conversation, command, notification, approval, and delivery concepts.

---

# Long-Term Vision

```text
v0.1  Foundation                    ✅
v1.0  Mission Control               ✅
v2.0  AI Core / Knowledge           🚧
v3.0  Multi-Agent Collaboration     🚧
v4.0  Company Operating System      🚧
v5.0  Communication Layer           🚀 NEXT
v6.0  Autonomous Business           ⏳
v7.0  Luuku OS                      ⏳
```

The long-term objective is an AI Operating System where specialized agents collaborate through shared knowledge, memory, orchestration, communication, and execution infrastructure to run real business workflows autonomously.

---

# Development Principles

- Build modular systems.
- Keep responsibilities separated.
- Prefer composition over duplication.
- Prove behavior before optimizing.
- Keep core infrastructure framework-agnostic where practical.
- Agents should use shared services rather than coupling directly to storage.
- Communication channels should be adapters, not the business logic.
- Human approval remains available for consequential decisions.

---

**Repository:** `typekhalifa/luuku-ai`

**Canonical engineering version:** `v0.10.0`

**Next strategic milestone:** `v5.0 — Communication Layer`
