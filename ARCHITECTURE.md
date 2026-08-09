# Luuku AI Architecture

> **An AI Operating System for autonomous business workflows, specialized agents, and executive coordination.**

---

# Vision

Luuku AI is being built as an AI Operating System where specialized agents collaborate through shared services, knowledge, memory, orchestration, communication, and execution infrastructure.

The architecture is intentionally modular: agents are replaceable workers, while the shared platform provides the coordination and operating primitives they depend on.

---

# Architectural Principles

## 1. Separation of Responsibilities

Agents should use shared services and platform contracts rather than coupling directly to storage or infrastructure.

```text
Agents
  ↓
Shared Services / Platform
  ↓
Storage / External Systems
```

## 2. Shared Organizational State

The organization needs common state across agents, including tasks, events, conversations, knowledge, memory, CRM information, execution state, and logs.

## 3. Orchestration

Executive AI and other entry points should not directly perform every operation. Goals are translated into plans, routed to capabilities/agents, executed through runtime infrastructure, and observed through events and state.

```text
Goal
 ↓
Planner
 ↓
Router
 ↓
Registry / Capabilities
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
```

## 4. Communication Is an Interface to the Operating System

WhatsApp, Discord, Slack, Telegram, and voice should be channel adapters around a shared communication core. Channel-specific code should not contain the company's workflow logic.

---

# Current System Architecture

```text
Founder / External Channel
          │
          ▼
  ┌───────────────────┐
  │ Communication Core│
  └─────────┬─────────┘
            ▼
       Executive AI
            │
            ▼
         Planner
            │
            ▼
          Router
            │
            ▼
   Agent / Capability Registry
            │
            ▼
       Orchestrator
            │
            ▼
           Queue
            │
            ▼
          Runtime
            │
            ▼
        Execution
            │
            ▼
   Events / State / Logs
            │
            └──────────────► Communication Core
```

---

# Agent Layer

Current agent areas include:

- Executive AI
- Executive Assistant
- Research Agent
- Sales Agent
- Business agents/workflows
- Communication / Voice
- Dashboard and executive dashboard
- Database, CRM, workflow, activity, contact, and deal test agents

The agent set is intentionally extensible. Marketing, support, finance, developer, operations, legal, and other specialized agents can be added without redesigning the platform core.

---

# Shared Platform

`luuku-ai/shared/` currently contains reusable platform areas including:

- agents
- AI providers
- API
- applications
- capabilities
- collaboration
- communication
- configuration
- context
- conversation
- CRM
- database/domain services
- events
- executive intelligence
- IDs
- organization state
- providers
- runtime
- scheduler
- services
- types
- voice

These modules form the platform layer beneath the agents.

---

# Orchestration Layer

`luuku-ai/orchestration/` contains the core coordination primitives:

```text
agent/
executor/
planner/
router/
task/
```

Responsibilities include agent registration, capabilities, planning, routing, execution requests/results, task state, priorities, and orchestration flow.

---

# Knowledge & AI Foundation

The system includes evolving foundations for:

- knowledge asset loading
- document parsing
- chunking and validation
- embeddings
- AI/chat providers
- context construction
- conversation infrastructure
- memory
- tool/capability registration

These components support the transition from isolated agents toward knowledge-aware autonomous workflows.

---

# Communication Layer — v5.0

The next strategic milestone is the Communication Layer.

The communication core should own concepts such as:

- Message
- Conversation
- Channel
- Command
- Notification
- Approval
- Delivery

The initial channel targets are:

- WhatsApp
- Discord
- Slack
- Telegram
- Voice

The architecture should allow channels to be added or replaced without changing orchestration or agent business logic.

```text
Channel Adapter
      ↓
Communication Core
      ↓
Command / Event / Approval
      ↓
Orchestrator
      ↓
Agents + Runtime
      ↓
Result / Event
      ↓
Communication Core
      ↓
Founder
```

---

# Architectural Decisions

## ADR-001 — Agents use platform services

Agents should not couple directly to storage implementations. This allows infrastructure to evolve independently.

## ADR-002 — Shared modules do not depend on agents

Shared infrastructure remains below the agent layer to avoid circular dependencies.

## ADR-003 — Orchestration is centralized

Planning, routing, registration, queueing, and execution are platform responsibilities rather than duplicated inside every agent.

## ADR-004 — Communication channels are adapters

A channel integration must not become the system's business logic. The communication core provides a stable interface to the operating system.

## ADR-005 — Human approval remains a first-class capability

Consequential workflows should be able to pause for founder approval before execution continues.

---

# Canonical Roadmap

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

---

# Current Engineering Baseline

**Canonical engineering version:** `v0.10.0 — Autonomous Architecture Baseline`

Strategic roadmap versions (`v0.1` through `v7.0`) describe product milestones and are intentionally separate from the package/engineering version.

---

# Long-Term Vision

Luuku AI is not intended to become another chatbot.

The long-term objective is an AI Operating System where specialized agents collaborate through shared knowledge, memory, orchestration, communication, and execution infrastructure to run real business workflows autonomously.

---

**Luuku AI © 2026 — Type Khalifa**
