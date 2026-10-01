import express from "express";
import cors from "cors";
import { randomUUID, timingSafeEqual } from "node:crypto";

import { dashboardRouter } from "./routes/dashboard.route";
import { eventsRouter } from "./routes/events.route";
import { agentsRouter } from "./routes/agents.route";
import { workflowRouter } from "./routes/workflow.routes";
import { crmRouter } from "./routes/crm.routes";
import { runtimeRouter } from "./routes/runtime.routes";
import { resendWebhookRouter } from "./routes/resend-webhook.route";
import { authRouter } from "./routes/auth.routes";
import { healthRouter } from "./routes/health.routes";
import { metricsRouter } from "./routes/metrics.routes";
import { observabilityRouter } from "./routes/observability.routes";
import { observabilityAlertsRouter } from "./routes/observability-alerts.routes";
import { requireAuthentication } from "../auth/auth.middleware";
import { prisma } from "../database/client";
import { logStructured, recordHttpRequest } from "../observability";
import { recordObservabilityEvent } from "../observability/durable-events.js";

const app = express();

const port = Number(process.env.PORT || 3000);
const environment = process.env.NODE_ENV || "development";
const configuredOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const apiKey = process.env.LUUKU_API_KEY?.trim();
const apiCompanyId = process.env.LUUKU_API_COMPANY_ID?.trim();

if (environment === "production" && !apiKey) {
    throw new Error("LUUKU_API_KEY must be configured in production.");
}

if (environment === "production" && !apiCompanyId) {
    throw new Error("LUUKU_API_COMPANY_ID must be configured in production.");
}

function apiKeysMatch(suppliedKey: string | undefined): boolean {
    if (!suppliedKey || !apiKey) {
        return false;
    }

    const supplied = Buffer.from(suppliedKey, "utf8");
    const expected = Buffer.from(apiKey, "utf8");

    return (
        supplied.length === expected.length &&
        timingSafeEqual(supplied, expected)
    );
}

app.disable("x-powered-by");

app.use((request, response, next) => {
    const requestId = request.header("x-request-id")?.trim() || randomUUID();
    const traceId = request.header("x-trace-id")?.trim() || requestId;
    const startedAt = process.hrtime.bigint();

    response.setHeader("x-request-id", requestId);
    response.setHeader("x-trace-id", traceId);
    response.setHeader("x-content-type-options", "nosniff");
    response.setHeader("x-frame-options", "DENY");
    response.setHeader("referrer-policy", "no-referrer");
    response.setHeader("permissions-policy", "camera=(), microphone=(), geolocation=()");

    if (environment === "production") {
        response.setHeader(
            "strict-transport-security",
            "max-age=31536000; includeSubDomains",
        );
    }

    response.on("finish", () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        const route = request.route?.path
            ? `${request.baseUrl}${request.route.path}`
            : request.path;
        const context = response.locals.apiRequestContext as
            | { companyId?: string; userId?: string }
            | undefined;

        recordHttpRequest({
            method: request.method,
            route,
            statusCode: response.statusCode,
            durationMs,
        });

        if (context?.companyId) {
            void recordObservabilityEvent({
                eventType: "http.request.completed",
                source: "api",
                ownership: { scope: "COMPANY", companyId: context.companyId },
                requestId,
                traceId,
                severity: response.statusCode >= 500 ? "ERROR" : response.statusCode >= 400 ? "WARN" : "INFO",
                status: String(response.statusCode),
                actorType: context.userId ? "USER" : "SERVICE",
                actorId: context.userId,
                metadata: { method: request.method, route, statusCode: response.statusCode, durationMs: Math.round(durationMs * 100) / 100 },
            }).catch((error) => {
                logStructured("ERROR", "observability.event.persist_failed", { requestId, traceId, error: error instanceof Error ? error.message : String(error) });
            });
        }

        logStructured(
            response.statusCode >= 500
                ? "ERROR"
                : response.statusCode >= 400
                    ? "WARN"
                    : "INFO",
            "http.request.completed",
            {
                requestId,
                traceId,
                companyId: context?.companyId,
                userId: context?.userId,
                method: request.method,
                route,
                statusCode: response.statusCode,
                durationMs: Math.round(durationMs * 100) / 100,
            },
        );
    });

    next();
});

app.use(cors({
    origin: configuredOrigins.length > 0
        ? configuredOrigins
        : environment === "production"
            ? false
            : true,
    credentials: true,
}));

// Resend requires the exact raw request body for Svix signature verification.
app.use(
    "/api/v1/webhooks/resend",
    express.raw({
        type: "application/json",
        limit: "1mb"
    }),
    resendWebhookRouter
);

app.use(express.json({ limit: "1mb" }));

app.use("/", healthRouter);

app.use("/api/v1/auth", authRouter);

app.use((request, response, next) => {
    if (request.path.startsWith("/api/v1/webhooks/resend")) {
        return next();
    }

    const suppliedKey = request.header("x-luuku-api-key");

    if (suppliedKey) {
        if (!apiKeysMatch(suppliedKey)) {
            return response.status(401).json({ error: "UNAUTHORIZED" });
        }

        if (!apiCompanyId) {
            return response.status(503).json({ error: "TENANT_CONTEXT_NOT_CONFIGURED" });
        }

        void prisma.company.findUnique({
            where: { id: apiCompanyId },
            select: { id: true },
        }).then((company) => {
            if (!company) {
                response.status(503).json({ error: "TENANT_CONTEXT_INVALID" });
                return;
            }

            response.locals.apiRequestContext = {
                companyId: company.id,
                authMethod: "api-key",
                role: "SERVICE",
            };
            next();
        }).catch(() => {
            response.status(503).json({ error: "TENANT_CONTEXT_UNAVAILABLE" });
        });
        return;
    }

    void requireAuthentication(request, response, next);
});

app.use("/metrics", metricsRouter);
app.use("/api/v1/observability", observabilityRouter);
app.use("/api/v1/observability/alerts", observabilityAlertsRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/events", eventsRouter);
app.use("/api/v1/agents", agentsRouter);
app.use("/api/v1/workflow", workflowRouter);
app.use("/api/v1/crm", crmRouter);
app.use("/api/v1/runtime", runtimeRouter);

app.listen(port, () => {
    logStructured("INFO", "api.started", {
        environment,
        port,
    });
});
