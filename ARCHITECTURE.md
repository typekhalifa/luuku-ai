# Luuku AI Architecture

> **An AI Operating System for autonomous business workflows, specialized agents, executive coordination and real-world execution.**

## 1. System boundary

~~~text
LUUKU AI
│
├── Backend: luuku-ai/
│   ├── Executive / OS
│   ├── Agents
│   ├── Orchestration
│   ├── Knowledge
│   ├── Memory
│   ├── Communication
│   ├── CRM
│   ├── Events
│   ├── Persistence
│   └── Runtime / Execution
│
└── Frontend: apps/
    ├── mission-control/  → internal company cockpit
    └── web-new/          → public company website
~~~

## 2. Core operating loop

The target system is a continuous closed loop:

~~~text
OBSERVE
  ↓
UNDERSTAND COMPANY STATE
  ↓
SELECT WORK
  ↓
PRIORITIZE
  ↓
ASSESS CAPACITY / RESOURCES / ECONOMICS
  ↓
EVOLVE STRATEGY
  ↓
PLAN
  ↓
MANAGE EXCEPTIONS
  ↓
EXECUTE THROUGH V6
  ↓
OBSERVE VERIFIED OUTCOMES
  ↓
LEARN / REMEMBER
  ↓
OBSERVE AGAIN
~~~

This is the architecture that turns a collection of agents into an operating system.

## 3. Authority model

The architecture has explicit layers of responsibility:

### V8 — Executive orchestration and adaptation
V8 observes, reasons about company state, selects work, prioritizes, plans, manages exceptions, remembers, learns and evolves strategy.

### V7 / V7.9 — Executive intelligence and governance
These layers provide executive decision support, autonomy policy, safety and approval boundaries.

### V6 — Execution authority
V6 owns the actual workflow/queue/runtime execution path.

### Agents and capabilities
Agents perform specialized work through registered capabilities and shared platform services.

### Actuators
Actuators are the boundary to the external world: CRM mutation, email delivery, sales activity, Discord, voice, WhatsApp and future integrations.

**No layer above V6 may silently execute work outside V6.**

## 4. Current executive stack

The current executive system includes:

~~~text
Executive Observation
        ↓
Executive Intent
        ↓
Objective-Driven Cycle
        ↓
Work Arbitration / Prioritization
        ↓
Capacity
        ↓
Resource Budget
        ↓
Tradeoff Economics
        ↓
Learning Adaptation
        ↓
Strategy Evolution
        ↓
Long-Horizon Planning
        ↓
Exception Management
        ↓
Autonomous Company Loop
        ↓
Durable Execution / Recovery
        ↓
V6
~~~

V8-K, V8-L, V8-M, V8-N and V8-O are explicit architectural layers rather than replacement systems.

## 5. Agent architecture

Current implementation areas include Executive AI, Executive Assistant, Research, Sales, Business workflows, Communication/Voice, dashboards and test agents.

The future organization may add departments such as Marketing, Support, Finance, Development, Operations, Legal and others.

Agent count is not the finish line.

The finish line is the ability to give the executive system an objective and let it coordinate the required capabilities without the founder manually assigning every task.

## 6. Knowledge and memory

Knowledge infrastructure provides document loading, parsing, chunking, embeddings, vector storage, retrieval, context construction and AI provider abstractions.

Executive memory records lifecycle events such as decisions, action outcomes, objective progress and interventions.

Institutional memory deliberately promotes explicit lessons and decisions rather than manufacturing company facts from arbitrary execution outcomes.

## 7. Communication architecture

Communication is an interface to the operating system, not the business logic.

~~~text
Channel
   ↓
Channel Adapter
   ↓
Communication Core
   ↓
Executive / Agents / Runtime
   ↓
Execution Result + Evidence
   ↓
Communication Core
   ↓
Founder / External Participant
~~~

Current infrastructure includes Discord, real-email provider integration and voice architecture. WhatsApp, Slack and Telegram remain future integrations.

## 8. Execution integrity

External actions must preserve the distinction:

~~~text
prepared
   ≠
queued
   ≠
attempted
   ≠
executed
   ≠
verified
~~~

Communication execution records and actuator contracts should preserve provider identity, external identifiers, evidence, status and idempotency where applicable.

## 9. Persistence

Prisma/PostgreSQL models currently cover:
- CRM
- communication conversations/messages/events/executions
- workflows and workflow steps
- queue items
- executive checkpoints
- executive event inbox
- objectives
- executive memory
- institutional memory

Production composition should inject durable stores explicitly rather than relying on in-memory defaults.

## 10. Frontend architecture

### Mission Control
Internal operational cockpit for observing company state, agents, events, workflow, runtime and CRM.

### web-new
Public-facing Luuku AI website.

These applications are separate from the backend operating system and should consume stable APIs/contracts rather than embedding backend business logic.

## 11. Production target

~~~text
                 LUUKU AI OS
                      ↓
              Executive Brain
                      ↓
            Autonomous Company Loop
                      ↓
           Durable Execution / V6
                      ↓
      ┌───────────────┼────────────────┐
      ↓               ↓                ↓
     CRM           Communication     Sales
                      │
             ┌────────┼────────┐
             ↓        ↓        ↓
           Email    Voice   WhatsApp
                      ↓
                External World
                      ↓
          Evidence / Events / State
                      ↓
               Memory / Learning
                      ↓
                   Loop
~~~

## 12. Architectural finish line

Luuku becomes an autonomous internal operating system when it can continuously:

1. observe company reality;
2. understand objectives and current state;
3. choose and prioritize work;
4. plan multi-step outcomes;
5. coordinate agents and capabilities;
6. execute only through the authorized V6 boundary;
7. interact with real external systems through controlled actuators;
8. record verified outcomes;
9. recover durable work after interruption;
10. learn and adapt;
11. escalate consequential exceptions to the founder;
12. repeat the cycle without requiring manual task assignment for every step.

## 13. Production and productization

After the internal loop is reliable:

~~~text
Internal Luuku OS
      ↓
Security / Tenancy / Deployment / Monitoring
      ↓
Real-world Actuators
      ↓
Production Workflows
      ↓
Reusable OS contracts
      ↓
Customer-specific organizations
      ↓
Luuku AI OS product
~~~

For the detailed current-state audit, see docs/ARCHITECTURE-AUDIT.md.
