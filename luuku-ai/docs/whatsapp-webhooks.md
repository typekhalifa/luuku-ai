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

The endpoint stores raw event payloads and message/status metadata as `SYSTEM`-scoped records. For the controlled founder round trip, only plain-text messages whose sender exactly matches `WHATSAPP_TEST_RECIPIENT` are passed into a persistent SYSTEM-scoped founder conversation and routed to Lex. Lex replies through the governed `whatsapp.send` capability, with the same controlled-recipient allowlist and durable idempotency ledger. Other senders and non-text messages are captured but do not invoke Lex. This is intentionally not a general prospect-messaging path; tenant/contact resolution and broader recipient permissions require a separate reviewed change.

Automatic replies are enabled only when `WHATSAPP_MODE=live`, the WhatsApp access token, phone-number ID, Graph API version, controlled recipient, and `LUUKU_WHATSAPP_LIVE_CONFIRMATION=SEND_TO_CONTROLLED_TEST_CONTACT` are all configured. In test mode or with incomplete live configuration, webhook events are stored but no reply is sent.

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

The controlled founder-routing contract test is separate:

```powershell
npm run dev:v8.29:whatsapp-founder-roundtrip
```

It validates allowlisted sender matching, text-only routing, the WhatsApp reply target, and the test-mode kill gate with fake dependencies. It makes no network requests and sends no WhatsApp messages.
