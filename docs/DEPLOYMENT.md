# Luuku AI Production Deployment

## Purpose

This is the canonical deployment runbook for the Luuku AI backend.

The deployment model is intentionally simple and reproducible:

```text
GitHub main
    ↓
Production Image workflow
    ↓
Validation + Prisma migration smoke test
    ↓
Docker build
    ↓
GHCR image
    ↓
Production runtime
    ↓
Prisma migrate deploy
    ↓
/healthz
    ↓
/readyz
    ↓
Authenticated API
```

The runtime image is the same image validated by CI. The deployment target is responsible for providing the production environment variables and PostgreSQL connection.

## Production requirements

### Runtime

- Linux container runtime
- Node.js 22 image through the repository Dockerfile
- PostgreSQL 16+ compatible database
- HTTPS termination
- Persistent managed PostgreSQL storage
- Secret management provided by the hosting platform

### Required environment

```text
NODE_ENV=production
PORT=3000
DATABASE_URL=<managed PostgreSQL connection string>
CORS_ORIGINS=https://<mission-control-origin>
LUUKU_API_KEY=<server-side service key>
LUUKU_API_COMPANY_ID=<existing Company.id>
```

If Mission Control is deployed separately, use its authenticated session boundary rather than exposing `LUUKU_API_KEY` to the browser.

Optional provider credentials are added only when their actuator is intentionally activated.

## Database migration policy

The container entrypoint runs:

```text
npx prisma migrate deploy --schema prisma/schema.prisma
```

before starting the API.

Production must never use `prisma db push`.

For multi-replica deployments, use the platform's release/migration phase as the preferred long-term migration runner. The container migration step is a safe bootstrap/default for the initial single-runtime deployment and uses Prisma's migration locking.

## Health and readiness

### Liveness

```text
GET /healthz
```

Returns HTTP 200 when the API process is alive.

### Readiness

```text
GET /readyz
```

Returns HTTP 200 only when the API can reach PostgreSQL. A database failure returns HTTP 503.

The deployment platform should route traffic only to ready instances.

## Secrets

Never commit production credentials.

At minimum, store these in the hosting platform's secret manager:

- `DATABASE_URL`
- `LUUKU_API_KEY`
- `LUUKU_API_COMPANY_ID`
- authentication bootstrap values only during initial owner bootstrap
- provider credentials only for activated actuators

Rotate secrets without placing them in the Docker image.

## Release process

1. Merge validated code into `main`.
2. GitHub Actions runs the Production Image workflow.
3. The workflow validates Prisma, applies disposable CI migrations, typechecks the backend and builds the exact production Docker image.
4. The image is published to GitHub Container Registry.
5. The deployment platform pulls the immutable commit/SHA image.
6. Configure production secrets.
7. Start the runtime.
8. The entrypoint applies pending migrations.
9. Verify `/healthz`.
10. Verify `/readyz`.
11. Verify authenticated API access with a non-browser service client.
12. Run a representative tenant-scoped smoke workflow.
13. Confirm logs contain no secrets and execution/audit evidence is being recorded.

## Rollback

Rollback the runtime to the previous known-good image tag.

Database migrations must remain backward-compatible with the application version being rolled back to. Destructive schema changes require a staged expand/migrate/contract rollout rather than an immediate destructive migration.

## Production boundary

Deployment does not automatically activate unrestricted external autonomy.

The following remain separate release gates:

- real actuator credentials
- actuator-specific permissions
- provider evidence
- idempotency
- approval policies
- monitoring and alerting
- founder escalation
- production autonomy

V6 remains the sole execution authority.

## Initial production smoke checklist

- [ ] Container starts with production secrets
- [ ] Prisma migrations apply successfully
- [ ] `/healthz` returns 200
- [ ] `/readyz` returns 200
- [ ] Unauthenticated protected request is rejected
- [ ] Authenticated request resolves the configured tenant
- [ ] Cross-tenant resource access is rejected
- [ ] V6 execution boundary remains authoritative
- [ ] No browser bundle contains `LUUKU_API_KEY`
- [ ] Logs and request IDs are available
- [ ] Database backups are enabled
- [ ] Rollback image is identified
- [ ] At least one representative end-to-end workflow is verified
