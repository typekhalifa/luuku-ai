# Phase 5.3 — Controlled Real Email E2E

## Purpose

Phase 5.3 proves that Luuku AI can perform one deliberately authorized real email side effect through the existing communication architecture without creating a parallel execution path.

The path under test is:

`controlled request → CommunicationPolicy → CommunicationRouter → CommunicationExecutionService → Resend → durable provider evidence`

This is a manual production smoke test, not a CI test.

## Safety gates

The real provider call is allowed only when all of these are true:

1. `LUUKU_PHASE5_LIVE_EMAIL_CONFIRMATION=SEND_ONE_REAL_EMAIL`
2. `EMAIL_MODE=live`
3. `LUUKU_LIVE_EMAIL_CONFIRMATION=SEND_TO_CONTROLLED_TEST_CONTACT`
4. `RESEND_API_KEY` is configured.
5. `RESEND_FROM_EMAIL` is configured.
6. `EMAIL_TEST_RECIPIENT` or `LUUKU_TEST_CONTACT_EMAIL` is configured.
7. `LUUKU_PHASE5_LIVE_EMAIL_COMPANY_ID` identifies the tenant.
8. `LUUKU_PHASE5_LIVE_EMAIL_CONTACT_ID` identifies a verified CRM contact in that tenant.
9. The CRM contact email exactly matches the configured controlled test recipient.

The adapter also independently enforces the controlled-recipient and live-confirmation gates.

## What the smoke test proves

The script:

1. Loads the exact tenant-scoped CRM contact.
2. Verifies the contact is marked verified.
3. Verifies the recipient matches the controlled inbox.
4. Sends exactly one real email through `communicationRouter`.
5. Requires a verified Resend response with an external provider ID.
6. Requires a durable `CommunicationExecution` ledger record.
7. Replays the exact same request with the exact same idempotency key.
8. Requires the replay to return the existing verified result without creating another provider execution.
9. Requires the original provider external ID to remain stable.

## Run

From the repository root, after loading the production/test environment variables into the process:

```bash
npm run dev:v8.18:controlled-real-email
```

This command must not be added to ordinary CI. It intentionally crosses the external provider boundary.

## Required environment

```text
EMAIL_MODE=live
RESEND_API_KEY=<controlled Resend API key>
RESEND_FROM_EMAIL=<verified sender>
EMAIL_TEST_RECIPIENT=<controlled test inbox>
LUUKU_LIVE_EMAIL_CONFIRMATION=SEND_TO_CONTROLLED_TEST_CONTACT
LUUKU_PHASE5_LIVE_EMAIL_CONFIRMATION=SEND_ONE_REAL_EMAIL
LUUKU_PHASE5_LIVE_EMAIL_COMPANY_ID=<tenant company id>
LUUKU_PHASE5_LIVE_EMAIL_CONTACT_ID=<verified CRM contact id>
```

## Expected result

A successful run prints:

- Live gate: PASS
- Provider live mode: PASS
- Tenant-scoped CRM contact: PASS
- Recipient allowlist: PASS
- Communication policy: PASS
- Resend provider execution: PASS
- Provider external ID
- Durable execution ledger: PASS
- Idempotent replay: BLOCKED
- `PHASE 5.3 CONTROLLED REAL EMAIL E2E: PASS`

## Architectural boundary

This test does not bypass V6, governance, or the communication layer.

It is a controlled actuator smoke test for the existing communication execution path. CI remains provider-neutral and must never send real external email.

The next Phase 5 work should attack provider rejection, unknown outcomes, stale/restarted execution, identity mismatch, cross-tenant recipient substitution, kill-switch intervention, and reconciliation of unknown provider outcomes.
