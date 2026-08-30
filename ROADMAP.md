# 🚀 LUUKU AI ROADMAP

> **Vision**
>
> Build an AI Systems Architecture platform that enables businesses to operate through autonomous AI agents working together as a coordinated company.

This roadmap describes **strategic product milestones**. It is intentionally separate from the package engineering version (`package.json`).

---

# v0.1 — FOUNDATION ✅

- Project setup
- React / web platform
- Express backend
- TypeScript
- SDK
- Applications
- Controllers
- Routes
- Architecture

---

# v1.0 — MISSION CONTROL ✅

- Dashboard
- Agents
- Events
- Workflow
- CRM
- Runtime

---

# v2.0 — AI CORE / KNOWLEDGE 🚧

Give agents reliable knowledge, memory, context, and AI capabilities.

### Knowledge

- Knowledge sources
- Document loaders
- Parsing and cleaning
- Chunking
- Embeddings
- Vector database
- Retrieval
- Hybrid search
- Reranking
- Context builder

### AI infrastructure

- Model/provider abstraction
- Tool calling
- Prompt/context optimization
- Caching
- Memory
- Guardrails
- Evaluation

The repository already contains evolving knowledge, embedding, context, conversation, provider, memory, and capability foundations. This milestone continues hardening them.

---

# v3.0 — MULTI-AGENT COLLABORATION 🚧

Allow specialized agents to work together instead of operating as isolated scripts.

Initial roles include:

- Executive AI
- Research Agent
- Sales Agent
- Support Agent
- Developer Agent
- Marketing Agent
- Finance Agent
- Operations Agent

Not every agent must exist before this milestone is useful. New agents should be addable without redesigning the platform.

Each agent should progressively gain:

- Memory
- Tools
- Permissions
- Planning
- Execution
- Communication
- Shared capabilities

---

# v4.0 — COMPANY OPERATING SYSTEM 🚧

Turn the agent collection into a coordinated organization.

```text
Executive AI
     ↓
Planner
     ↓
Router / Registry
     ↓
Orchestrator
     ↓
Queue
     ↓
Runtime
     ↓
Execution
     ↓
Events / Logs / State
```

Core capabilities:

- Goal decomposition
- Agent selection
- Task delegation
- Queueing
- Runtime execution
- Failure handling
- Agent communication
- Shared organizational state
- Human approval
- Monitoring

The repository already contains substantial foundations for planner, router, registry, executor, task, queue, runtime, collaboration, events, capabilities, and organization state.

---

# v5.0 — COMMUNICATION LAYER 🚀

## Objective

Operate Luuku AI from anywhere.

The communication layer is a reusable communication core connecting humans and external channels to the company operating system — not a collection of unrelated integrations.

### Communication Core

- Message
- Conversation
- Channel
- Command
- Notification
- Approval
- Delivery
- Conversation/thread identity

### Initial channels

- WhatsApp
- Discord
- Slack
- Telegram
- Voice

### Current state

- Discord founder → LEX loop: **proven**
- Real email execution through Sales Agent: **proven and verified**
- Voice provider architecture: **implemented; live provider activation pending credentials/accounts**
- WhatsApp / Slack / Telegram: **adapter targets, not yet activated**

### Core flow

```text
Founder / External Channel
          ↓
   Communication Core
          ↓
 Commands / Events / Approvals
          ↓
       Orchestrator
          ↓
      Agents + Runtime
          ↓
      Results / Events
          ↓
   Communication Core
          ↓
        Founder
```

V5 should be considered complete only after the live voice path is independently tested and verified. Other channels can be added incrementally through the same communication core.

---

# v6.0 — AUTONOMOUS BUSINESS 🚧

Move from founder-directed actions toward coordinated, multi-step business workflows.

The first V6 foundation is now in the repository: workflow lifecycle contracts, dependent workflow steps, agent/capability ownership, and pure workflow readiness evaluation.

```text
Business Event / Executive Goal
            ↓
      Executive AI
            ↓
          Planner
            ↓
       Workflow Plan
            ↓
       Orchestrator
            ↓
    Agent / Capability Registry
            ↓
       Queue / Runtime
            ↓
        Execution
            ↓
      Events / State / Logs
            ↓
      Executive AI
            ↓
 Founder decision only when required
```

### V6 implementation sequence

1. Workflow contracts and dependency model **🚧 foundation started**
2. Workflow persistence and state transitions
3. Planner that produces real multi-step plans
4. Orchestrator that routes plan steps to capabilities
5. Queue-backed execution and retry policy
6. Result/event propagation back to Executive AI
7. Approval checkpoints for consequential steps
8. First end-to-end autonomous business workflow
9. Add specialized departments as real workflows demand them
10. Harden observability, failure recovery, idempotency, and auditability

The target is not a large agent count. The target is a company that can receive an objective and coordinate the required capabilities without the founder manually assigning every task.

See `docs/v6-autonomous-business.md` for the detailed V6 contract and finish line.

---

# v7.0 — LUUKU OS ⏳

Turn Luuku AI into an operating system for AI-native businesses.

Future capabilities may include:

- Multi-organization support
- Enterprise memory
- Knowledge graph
- Agent marketplace
- Live collaboration
- AI operating console
- Autonomous business operations
- Client organization workspaces

---

# ENGINEERING PRINCIPLES

- Build modular systems.
- Keep responsibilities separated.
- Prefer composition over duplication.
- Prove behavior before optimizing.
- Every feature should expose a clean API contract.
- Core infrastructure should remain framework-agnostic whenever practical.
- Agents should use shared platform services rather than coupling directly to storage.
- Communication channels should remain adapters around the communication core.
- Human approval should remain available for consequential actions.
- Add new specialized agents without redesigning the operating system.

---

# CURRENT STATE

```text
v0.1  Foundation                    ✅
v1.0  Mission Control               ✅
v2.0  AI Core / Knowledge           🚧
v3.0  Multi-Agent Collaboration     🚧
v4.0  Company Operating System      🚧
v5.0  Communication Layer           🚀 ACTIVE
v6.0  Autonomous Business           🚧 FOUNDATION STARTED
v7.0  Luuku OS                      ⏳
```

**Canonical engineering version:** `v0.10.0`

**Current strategic milestone:** `v5.0 — Communication Layer`

**Next major build:** `v6.0 — Autonomous Business`

---

**Last Updated:** August 2026
