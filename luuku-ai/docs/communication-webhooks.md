# Resend Communication Webhooks

Luuku AI now accepts verified Resend webhook events at:

`POST /api/v1/webhooks/resend`

The route must receive the raw JSON request body because Resend webhook signatures are verified against the exact payload. The endpoint validates the Svix `svix-id`, `svix-timestamp`, and `svix-signature` headers before accepting an event.

## Environment

Add the Resend webhook signing secret to the local `.env` file:

```env
RESEND_WEBHOOK_SECRET=whsec_...
```

Do not commit the secret.

## Database

The webhook events are stored in the PostgreSQL `CommunicationEvent` table with:

- provider event ID (unique, for idempotency)
- Resend event type
- Resend email ID
- Message-ID
- sender
- recipient
- subject
- full event payload
- received timestamp

Apply the migration locally with:

```powershell
npx prisma migrate deploy
npx prisma generate
```

## Resend setup

Create a webhook in Resend and point it at the publicly reachable Luuku API URL plus:

`/api/v1/webhooks/resend`

For the first production-hardening test, subscribe only to:

- `email.sent`
- `email.delivered`
- `email.bounced`
- `email.failed`
- `email.received`

Keep testing against the controlled Luuku recipient before enabling prospect-facing communication.

## Architecture

```text
Sales Agent
    ↓
Communication Router
    ↓
Resend
    ↓
email.sent / delivered / bounced / failed / received
    ↓
Resend Webhook
    ↓
Signature Verification
    ↓
CommunicationEvent (PostgreSQL)
    ↓
Lex reads communication reality
```

Provider acceptance is not treated as delivery. Webhook events become the source of downstream communication state.
