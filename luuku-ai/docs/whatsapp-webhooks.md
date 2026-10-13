# WhatsApp Cloud API Webhooks

Luuku AI accepts Meta WhatsApp Cloud API webhooks at:

- `GET /api/v1/webhooks/whatsapp` — Meta subscription verification handshake
- `POST /api/v1/webhooks/whatsapp` — signed event ingestion

## Required environment

Configure these in the deployment secret store or local `.env`. Never commit the values.

```env
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<random-long-verification-token>
WHATSAPP_APP_SECRET=<Meta-app-secret>
```

The verify token is used only for Meta's GET handshake. The app secret validates the `X-Hub-Signature-256` HMAC over the exact raw POST body. The endpoint fails closed if either secret is missing. The raw body must be preserved; the API mounts `express.raw()` before the general JSON parser.

## Events and idempotency

Inbound messages are stored in `CommunicationEvent` using a stable provider event ID based on the business phone-number ID and WhatsApp message ID. Status updates use a stable SHA-256 identity derived from phone-number ID, message ID, status, timestamp, and recipient. The table's unique `providerEventId` constraint deduplicates Meta retries.

The endpoint stores raw event payloads and message/status metadata. It does **not** yet create conversations, resolve contacts, trigger agents, or send replies. Until a reviewed phone-number-to-tenant mapping is available, events are stored as `SYSTEM`-scoped records; downstream tenant-specific processing must not assume they belong to a company.

## Meta configuration

Set the callback URL to the publicly reachable Luuku API base URL plus:

`/api/v1/webhooks/whatsapp`

Use the exact `WHATSAPP_WEBHOOK_VERIFY_TOKEN` value in Meta's webhook setup and subscribe to the WhatsApp `messages` field. Store the Meta app secret as `WHATSAPP_APP_SECRET` in the runtime secret store.

## Validation

Run the fake-data/PostgreSQL contract test:

```powershell
npm run dev:v8.28:whatsapp-webhook
```

It verifies signature acceptance/rejection, stable event identities, durable persistence, and duplicate delivery handling. It makes no network requests and sends no WhatsApp messages.
