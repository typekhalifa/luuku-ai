# ADR-001

## Title

Mission Control Never Executes AI

---

## Status

Accepted

---

## Context

Mission Control is responsible for operating the platform.

AI execution belongs to the backend.

---

## Decision

Mission Control:

- Displays information
- Sends commands
- Receives events

Mission Control never:

- Executes LLMs
- Uses Browser automation
- Sends Emails
- Executes WhatsApp
- Runs workflows

Those responsibilities belong to luuku-ai.

---

## Consequences

- Clean separation
- Easier testing
- Independent deployments
- Better scalability