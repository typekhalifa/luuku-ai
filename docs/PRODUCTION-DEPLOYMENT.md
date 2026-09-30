# Production Deployment

## Runtime

Luuku API is packaged as a Node 22 container.

Build:

```bash
docker build -t luuku-ai:production .
```

Run:

```bash
docker run --rm -p 3000:3000 --env-file .env luuku-ai:production
```

The container starts the compiled API with:

```bash
node dist/backend/shared/api/server.js
```

## Database

Production database changes are applied with Prisma migrations:

```bash
npm run db:deploy
```

Run migrations **before** routing production traffic to an application image that requires the new schema.

Do not use `prisma migrate dev` in production.

## Required production environment

At minimum:

- `NODE_ENV=production`
- `DATABASE_URL`
- `PORT`
- `CORS_ORIGINS`
- `LUUKU_API_KEY`
- `LUUKU_API_COMPANY_ID`

Authentication bootstrap is one-time administrative setup:

- `LUUKU_AUTH_BOOTSTRAP_EMAIL`
- `LUUKU_AUTH_BOOTSTRAP_PASSWORD`
- `LUUKU_AUTH_BOOTSTRAP_NAME`
- `LUUKU_AUTH_BOOTSTRAP_COMPANY_ID`

Provider secrets should be supplied only through the deployment platform's secret manager.

## Health and readiness

Public liveness:

```
GET /healthz
```

This verifies that the API process is responding.

Database readiness:

```
GET /readyz
```

This performs a database connectivity check and returns HTTP 503 when the API cannot reach PostgreSQL.

Use `/healthz` for container liveness and `/readyz` for load-balancer/service readiness.

## Deployment order

1. Build the immutable application image.
2. Run `npm run db:deploy` against the target database.
3. Start the new application revision.
4. Wait for `/readyz` to return HTTP 200.
5. Route traffic to the ready revision.
6. Keep the previous revision available for rollback.
7. Verify application logs and database/provider connectivity.

## Rollback

Application rollback should use a previously built image.

Database rollback is separate: Prisma migrations should be treated as forward-only unless a migration has an explicitly reviewed rollback procedure. Do not automatically reverse production schema changes as part of an application rollback.

## Secrets

Never commit real credentials, API keys, session secrets, provider secrets, or production database URLs.

The repository's `.env.example` is documentation only.
