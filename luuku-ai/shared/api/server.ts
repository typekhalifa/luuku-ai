import express from "express";
import cors from "cors";

import { dashboardRouter } from "./routes/dashboard.route";
import { eventsRouter } from "./routes/events.route";
import { agentsRouter } from "./routes/agents.route";
import { workflowRouter } from "./routes/workflow.routes";
import { crmRouter } from "./routes/crm.routes";
import { runtimeRouter } from "./routes/runtime.routes";
import { resendWebhookRouter } from "./routes/resend-webhook.route";

const app = express();

const port = Number(process.env.PORT || 3000);
const environment = process.env.NODE_ENV || "development";
const configuredOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const apiKey = process.env.LUUKU_API_KEY?.trim();

if (environment === "production" && !apiKey) {
    throw new Error("LUUKU_API_KEY must be configured in production.");
}

app.disable("x-powered-by");

app.use(cors({
    origin: configuredOrigins.length > 0
        ? configuredOrigins
        : environment === "production"
            ? false
            : true,
}));

app.use((request, response, next) => {
    if (!apiKey || request.path.startsWith("/api/v1/webhooks/resend")) {
        return next();
    }

    const suppliedKey = request.header("x-luuku-api-key");
    if (!suppliedKey || suppliedKey !== apiKey) {
        return response.status(401).json({
            error: "UNAUTHORIZED",
        });
    }

    return next();
});

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

app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/events", eventsRouter);
app.use("/api/v1/agents", agentsRouter);
app.use("/api/v1/workflow", workflowRouter);
app.use("/api/v1/crm", crmRouter);
app.use("/api/v1/runtime", runtimeRouter);

app.listen(port, () => {
    console.log("");
    console.log("==================================");
    console.log(" LUUKU API");
    console.log("==================================");
    console.log("");
    console.log(`Environment: ${environment}`);
    console.log(`Running on port ${port}`);
});
