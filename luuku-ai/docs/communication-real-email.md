# Phase C.2 — Real Email Execution

Luuku AI now has a provider-neutral `email.send` capability backed by Resend.

## Environment

Add these values to the local `.env` file:

```env
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL=Luuku AI <hello@your-verified-domain.com>
```

Do not commit `.env` or the API key.

## Controlled test

Run:

```powershell
npx tsx luuku-ai/shared/communication/demo/real-email-demo.ts <your-own-email>
```

The test calls the same communication router used by future agent execution.

## Execution truth

A successful provider response must return a provider email ID. Luuku records:

- `status: "verified"`
- `executed: true`
- `verified: true`
- provider: `resend`
- external ID: Resend email ID

If the provider is not configured, the router returns `blocked` instead of pretending an email was sent.

## Architecture

```text
Executive / Sales Agent
        ↓
Communication Router
        ↓
email.send
        ↓
Resend Adapter
        ↓
Resend API
        ↓
Provider email ID
        ↓
ExecutionResult
        ↓
Reality Integrity / CRM
```

The provider remains an adapter. Agents do not contain Resend-specific API calls.
