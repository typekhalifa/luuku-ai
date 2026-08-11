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

app.use(cors());

// Resend requires the exact raw request body for Svix signature verification.
app.use(
    "/api/v1/webhooks/resend",
    express.raw({
        type: "application/json",
        limit: "1mb"
    }),
    resendWebhookRouter
);

app.use(express.json());

// API v1
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/events", eventsRouter);
app.use("/api/v1/agents", agentsRouter);
app.use("/api/v1/workflow", workflowRouter);
app.use("/api/v1/crm", crmRouter);
app.use("/api/v1/runtime", runtimeRouter);

const PORT = 3000;

app.listen(PORT, () => {
    console.log("");
    console.log("==================================");
    console.log(" LUUKU API");
    console.log("==================================");
    console.log("");
    console.log(`Running on http://localhost:${PORT}`);
});
