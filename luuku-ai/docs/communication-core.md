# Communication Core

## Purpose

The Communication Core is the provider-neutral boundary between Luuku's operating system and external communication channels.

~~~text
Executive / Agent
       ↓
Communication Core
       ↓
Channel / Capability Adapter
       ↓
External Provider
       ↓
Execution Result + Evidence
       ↓
CRM / Memory / Executive State
~~~

## Contract

Communication adapters should expose provider-neutral capability and channel information, availability, execution and result semantics.

External results should distinguish:
- status
- executed
- verified
- summary
- evidence
- error
- provider/external identifiers where available
- idempotency information where applicable

## Current capabilities

The communication architecture includes targets for:
- email.send
- calendar.schedule
- voice.call
- whatsapp.send
- telegram.send
- discord.send
- slack.send

## Current implementation state

- Discord: adapter and gateway/listener infrastructure exists.
- Email: Resend adapter exists with explicit sandbox/live controls and controlled-recipient safeguards.
- Voice: agent and execution architecture exists; live provider activation remains a production integration step.
- WhatsApp: target capability; production adapter not yet complete.
- Slack: target capability; production adapter not yet complete.
- Telegram: target capability; production adapter not yet complete.

## Reality integrity

A prepared message, generated transcript, simulation or queued action is not automatically external execution.

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

CRM and executive state should only treat external communication as completed when the relevant execution and verification contract is satisfied.

## Actuator direction

Future real-world actuators must:
- reuse the shared communication core;
- preserve V6 execution authority;
- enforce policy and approval boundaries;
- support idempotency where the provider permits it;
- persist provider evidence;
- expose deterministic failure states;
- avoid embedding business logic inside channel adapters.

The next actuator phase is therefore production hardening and activation of existing architecture, not a communication rewrite.
