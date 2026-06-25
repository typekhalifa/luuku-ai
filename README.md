# Luuku AI

Luuku AI is a Rwanda-based AI systems architecture and consulting company focused on designing, building, and deploying practical AI systems for businesses, institutions, and the wider African ecosystem.

We are building Luuku AI from the inside out: first by creating our own internal AI Operating System, then by using those systems, workflows, and learnings to deliver AI solutions for clients.

---

## Vision

To become one of Africa’s most trusted AI systems companies by helping organizations implement AI that is practical, reliable, scalable, and rooted in real operational pain points.

Luuku AI is not being built around hype. It is being built around useful systems:
- AI workflow automation
- internal knowledge assistants
- AI copilots for operations and teams
- retrieval and knowledge systems
- AI infrastructure tailored to how each organization actually works

---

## Current Mission

Build Luuku AI from the inside out by creating our own internal AI Operating System.

The first internal stack includes:

- **Executive Assistant Agent** — founder planning, prioritization, and execution tracking
- **Research Agent** — business research and AI opportunity discovery
- **Sales / Outreach Agent** — future agent for offer drafting, prospect outreach, and follow-up
- **Knowledge System** — future memory and document intelligence layer
- **Agent Orchestration Layer** — future coordination system for multi-agent workflows

The goal is simple:

> If Luuku AI wants to build AI systems for other organizations, it should first build and test AI systems inside Luuku AI itself.

---

## Why This Repository Exists

Before Luuku AI becomes a full client-facing AI systems company, it needs an internal operating layer that can help run research, planning, outreach, and execution.

This repository is the beginning of that layer.

It is the working codebase for Luuku AI’s internal AI workforce: a set of agents and support systems designed to help the founder and, later, the company itself operate with more leverage.

In practical terms, this repository is where Luuku AI is building:
- internal planning and prioritization systems
- prospect and company research systems
- offer design support
- workflow automation experiments
- future client delivery building blocks
- the first pieces of Luuku AI’s long-term internal infrastructure

---

## Current Version
**v0.7.1 — Research Agent Prospect Intelligence Patch**

Live internal components:
- Executive Assistant Agent
- Research Agent

Latest upgrade in v0.7.1:
- Prospect scoring
- Research tags
- Outreach readiness assessment
- Immediate next research actions

---

# Current Agent Stack

## 1) Executive Assistant Agent

**Purpose:**  
Help the founder operate Luuku AI with better focus, prioritization, and execution discipline.

### Current capabilities
- accepts a daily task list
- ranks tasks into top priorities
- separates urgent vs strategic work
- generates a suggested execution sequence
- supports fallback mode when OpenAI is unavailable
- reads founder profile context
- reads recent logs to maintain continuity across days
- supports execution updates such as:
  - `DONE: task`
  - `CARRY: task`
  - `BLOCKED: task | blocker note`
  - `DROPPED: task`

### Example outputs
- daily priority brief
- carryover decisions
- next best actions
- execution update logging

---

## 2) Research Agent

**Purpose:**  
Help Luuku AI research businesses and identify practical AI automation opportunities worth pitching.

### Current capabilities
- accepts a business research brief
- generates a structured research summary
- identifies likely pain points
- suggests Luuku AI opportunity angles
- recommends a first offer to pitch
- drafts an outreach hook
- highlights what still needs validation
- supports fallback mode when OpenAI is unavailable
- saves research logs for later review

### Example use cases
- researching a bank, hospital, university, logistics company, or retailer
- identifying repetitive operational workflows
- spotting internal knowledge assistant opportunities
- preparing for future outreach and consulting offers

---

## 3) Future Agents

Planned next layers include:

### Sales / Outreach Agent
- convert research into first-offer outreach drafts
- generate proposal angles and personalized hooks
- help Luuku AI move from research to real pipeline activity

### Knowledge System
- unify founder notes, business research, offers, and historical logs
- support long-term memory across Luuku AI agents
- become the base for future internal and client-facing knowledge assistants

### Agent Orchestration Layer
- allow agents to work together instead of in isolation
- route tasks between research, planning, outreach, and memory systems
- become the coordination layer for Luuku AI’s internal operating system

---

# Strategic Direction

Luuku AI is being built around a practical belief:

**Most African organizations do not need “AI for AI’s sake.”**  
They need systems that solve real workflow friction.

That means Luuku AI will focus on use cases such as:
- internal knowledge retrieval
- repetitive customer support workflows
- operational reporting and summaries
- approvals and coordination bottlenecks
- document-heavy internal processes
- founder and team productivity systems
- business-specific copilots and automation layers

The long-term commercial direction is to position Luuku AI as a systems architecture and implementation company that helps African businesses adopt AI through concrete workflow solutions, not vague AI transformation language.

---

# Repository Structure

```text
.
├── data/
│   ├── founder-profile.md
│   └── research-agent-profile.md
│
├── logs/
│   └── generated local logs from agents
│
├── luuku-ai/
│   ├── agents/
│   │   ├── executive-assistant/
│   │   │   ├── agent.ts
│   │   │   └── prompt.md
│   │   │
│   │   └── research-agent/
│   │       └── agent.ts
│   │
│   ├── docs/
│   │   ├── agents.md
│   │   ├── architecture.md
│   │   ├── roadmap.md
│   │   └── vision.md
│   │
│   └── shared/
│       └── config/
│           └── env.ts
│
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md