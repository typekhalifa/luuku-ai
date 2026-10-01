# Luuku AI Production Observability

## Purpose

V8.10 establishes the first production observability boundary for the API. It is intentionally lightweight and dependency-free so the runtime can emit useful telemetry before a managed observability platform is selected.

The observability layer covers:

- structured JSON request logs;
- request/trace correlation IDs;
- HTTP request counters and latency metrics;
- Prometheus-compatible metrics output;
- service-scoped metrics access;
- health and readiness signals;
- existing durable execution/communication records as the application audit evidence.

## Request correlation

Every HTTP request receives:

- `x-request-id`: a unique request identifier unless the caller supplies one;
- `x-trace-id`: a correlation identifier, defaulting to the request ID unless the caller supplies one.

The response contains both headers so an operator can correlate an external request with application logs.

The API does not log request bodies, cookies, authorization headers, API keys, or other credential material.

## Structured logs

Completed requests emit one JSON log event:

`http.request.completed`

Example shape:

```json
{
  "timestamp": "2026-10-01T00:00:00.000Z",
  "level": "INFO",
  "service": "luuku-api",
  "event": "http.request.completed",
  "requestId": "...",
  "traceId": "...",
  "companyId": "...",
  "userId": "...",
  "method": "GET",
  "route": "/api/v1/crm",
  "statusCode": 200,
  "durationMs": 18.42
}
```

Company and user context are emitted only when the authenticated request context has resolved them.

## Metrics

The API exposes Prometheus-compatible metrics at `/metrics` and a JSON diagnostic snapshot at `/metrics/snapshot`.

Both endpoints require the authenticated `SERVICE` role. The production API-key path establishes this role.

Current metrics include:

- total HTTP requests;
- total HTTP 5xx responses;
- response counts by status;
- total response duration;
- maximum observed response duration;
- per-route request counts;
- per-route 5xx counts;
- per-route total duration;
- per-route maximum duration.

The current metrics are process-local. Restarting the API resets the counters. A managed metrics backend should scrape the endpoint and retain the time series externally.

## Health signals

- `/healthz` is liveness-only and does not require the database.
- `/readyz` performs a database connectivity check and returns HTTP 503 when the database is unavailable.

These endpoints are intentionally separate so an orchestrator can restart an unhealthy process without confusing application readiness with process liveness.

## Audit evidence

Luuku already persists durable evidence at the business/execution boundaries, including:

- workflow and workflow-step state;
- durable queue state;
- communication executions;
- communication provider events;
- executive memory;
- institutional memory;
- executive checkpoints and event inbox state.

These records remain tenant-scoped where applicable. V8.10 does not introduce a second execution or audit authority.

## Alerting gates

A production runtime should alert on at least:

1. repeated `/readyz` failures;
2. sustained HTTP 5xx responses;
3. abnormal request latency;
4. repeated provider/external execution failures;
5. queue/recovery backlog growth;
6. authentication or tenant-isolation failures.

Alert thresholds belong to the deployment environment and should be configured after baseline traffic is observed.

## Next observability gate

The next production step is to connect these signals to a managed log/metrics/tracing platform and define retention, dashboards, SLOs and alerts. The application-level correlation contract should remain stable when that backend is introduced.
