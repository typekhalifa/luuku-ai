# Luuku Platform Blueprint v1.0

> Last Updated: July 2026
> Status: Active
> Version: 1.0

---

# Vision

Luuku is an AI Operating System for businesses.

Rather than being a single AI assistant, Luuku is designed as a platform where multiple AI employees collaborate through a shared runtime, orchestration engine, memory layer, and tool ecosystem.

---

# Platform Architecture

```
                     Luuku Platform

               ┌─────────────────────┐
               │     Public Site     │
               │     luuku.ai        │
               └──────────┬──────────┘
                          │
               Marketing / Docs / Pricing
                          │
                          ▼

               ┌─────────────────────┐
               │  Mission Control    │
               │   app.luuku.ai      │
               └──────────┬──────────┘
                          │
               REST API / WebSocket
                          │
                          ▼

               ┌─────────────────────┐
               │      luuku-ai       │
               │  AI Execution Core  │
               └──────────┬──────────┘
                          │
      ┌──────────┬────────┼─────────┬──────────┐
      ▼          ▼        ▼         ▼          ▼

 Planner   Runtime   Registry   Memory    Tool Manager

                          │
                          ▼

           GPT / Gemini / Browser / Email / CRM
```

---

# Product Layers

## Public Website

Purpose

- Marketing
- Pricing
- Documentation
- Company Information

Never executes AI.

---

## Mission Control

Purpose

Mission Control is the operating dashboard.

Responsibilities

- Dashboard
- Monitoring
- Runtime Visualization
- Queue
- Scheduler
- CRM
- Timeline
- Logs
- Settings
- Command Center

Mission Control does not execute AI.

---

## luuku-ai

Purpose

The backend intelligence layer.

Responsibilities

- Planning
- Orchestration
- Runtime
- Memory
- Tool Execution
- AI Agents
- Workflows
- Knowledge
- External Integrations

---

# Ownership Rules

## Mission Control Owns

- UI
- Components
- Navigation
- Charts
- Tables
- Monitoring
- User Interaction

---

## luuku-ai Owns

- AI Execution
- Runtime
- Planning
- Memory
- RAG
- Browser
- Email
- WhatsApp
- Scheduling
- Tool Execution

---

## Shared Packages Own

- Contracts
- SDK
- Shared Types
- Shared Configuration

---

# Golden Rule

Before implementing any feature, answer:

1. Who owns this?
2. Who executes this?
3. Who displays this?

If the answer is unclear, implementation should stop until ownership is defined.

---

# Long-Term Vision

Mission Control becomes the command center.

luuku-ai becomes the AI operating system.

Together they form the Luuku Platform.