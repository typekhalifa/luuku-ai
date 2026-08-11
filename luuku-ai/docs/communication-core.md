# Communication Core

## Purpose

The Communication Core is the provider-neutral execution boundary for external communication. Agents request a capability; adapters execute it; providers supply real-world evidence; CRM consumes only verified execution results.

```text
Lex / Agent
    ↓
Communication Router
    ↓
Capability Adapter
    ↓
External Provider
    ↓
Execution Result + Evidence
    ↓
Reality Integrity
    ↓
CRM / Lex
```

## Contract

Every communication adapter implements:

- `capability`
- `channel`
- `isAvailable()`
- `execute(request)`

Every execution returns:

- `status`
- `executed`
- `verified`
- `evidence` when available
- `summary`
- `error` when execution fails or is blocked

## Capabilities

Initial provider-neutral capabilities include:

- `email.send`
- `calendar.schedule`
- `voice.call`
- `whatsapp.send`
- `telegram.send`
- `discord.send`
- `slack.send`

The router does not assume a provider. Providers are registered as adapters.

## Reality rule

A prepared message, simulated call, queued action, or generated transcript is not external execution.

CRM-changing communication outcomes require the existing Reality Integrity contract:

```text
executed === true
AND
verified === true
AND
status === completed | verified
```

## Provider roadmap

Phase C.1 — Core contract and router

Phase C.2 — Real email provider

Phase C.3 — Real calendar provider

Phase C.4 — Real voice provider

Phase C.5 — WhatsApp / Telegram / Slack adapters

New providers must implement the shared adapter contract rather than adding provider-specific logic to Lex or business agents.
