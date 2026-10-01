import crypto from "node:crypto";
import { prisma } from "../../database/client.js";
import { getCompanyObservabilityDashboard } from "../durable-events.js";

function assert(condition: boolean, message: string): void {
    if (!condition) throw new Error(`V8.11 DASHBOARD ASSERTION FAILED: ${message}`);
}

async function main(): Promise<void> {
    const companyId = crypto.randomUUID();
    const otherCompanyId = crypto.randomUUID();

    try {
        await prisma.company.createMany({
            data: [
                {
                    id: companyId,
                    name: `V8.11 Dashboard Demo A ${companyId.slice(0, 8)}`,
                    industry: "Testing",
                    country: "Rwanda",
                    status: "prospect",
                    confidence: 100,
                    verified: true,
                    source: "V8.11",
                },
                {
                    id: otherCompanyId,
                    name: `V8.11 Dashboard Demo B ${otherCompanyId.slice(0, 8)}`,
                    industry: "Testing",
                    country: "Rwanda",
                    status: "prospect",
                    confidence: 100,
                    verified: true,
                    source: "V8.11",
                },
            ],
        });

        const now = new Date();
        const from = new Date(now.getTime() - 60_000);

        await prisma.observabilityEvent.createMany({
            data: [
                {
                    companyId,
                    ownershipScope: "COMPANY",
                    eventType: "http.request.completed",
                    source: "v8.11-dashboard-demo",
                    severity: "INFO",
                    status: "200",
                    metadata: { durationMs: 10, synthetic: true },
                },
                {
                    companyId,
                    ownershipScope: "COMPANY",
                    eventType: "http.request.completed",
                    source: "v8.11-dashboard-demo",
                    severity: "ERROR",
                    status: "500",
                    metadata: { durationMs: 30, synthetic: true },
                },
                {
                    companyId,
                    ownershipScope: "COMPANY",
                    eventType: "execution.started",
                    source: "v8.11-dashboard-demo",
                    severity: "INFO",
                    status: "executing",
                },
                {
                    companyId,
                    ownershipScope: "COMPANY",
                    eventType: "execution.succeeded",
                    source: "v8.11-dashboard-demo",
                    severity: "INFO",
                    status: "completed",
                },
                {
                    companyId,
                    ownershipScope: "COMPANY",
                    eventType: "provider.failed",
                    source: "v8.11-dashboard-demo",
                    severity: "ERROR",
                    status: "failed",
                },
                {
                    companyId: otherCompanyId,
                    ownershipScope: "COMPANY",
                    eventType: "http.request.completed",
                    source: "v8.11-dashboard-demo",
                    severity: "ERROR",
                    status: "500",
                    metadata: { durationMs: 999, synthetic: true },
                },
            ],
        });

        const dashboard = await getCompanyObservabilityDashboard(companyId, from, new Date(now.getTime() + 1_000));

        assert(dashboard.requests === 2, "request count is tenant-scoped");
        assert(dashboard.request4xx === 0, "4xx count is correct");
        assert(dashboard.request5xx === 1, "5xx count is correct");
        assert(dashboard.executions.started === 1, "execution started count is correct");
        assert(dashboard.executions.succeeded === 1, "execution success count is correct");
        assert(dashboard.executions.failed === 0, "execution failure count is correct");
        assert(dashboard.providers.failed === 1, "provider failure count is correct");
        assert(dashboard.latency.samples === 2, "latency samples are captured");
        assert(dashboard.latency.averageMs === 20, "average latency is correct");
        assert(dashboard.latency.maxMs === 30, "max latency is correct");

        console.log("✓ dashboard aggregation is tenant-scoped");
        console.log("✓ HTTP, execution and provider lifecycle counts are aggregated");
        console.log("✓ durable request latency evidence is aggregated");
        console.log("");
        console.log("V8.11 operational dashboard validation: PASS");
    } finally {
        await prisma.observabilityEvent.deleteMany({ where: { companyId: { in: [companyId, otherCompanyId] } } });
        await prisma.company.deleteMany({ where: { id: { in: [companyId, otherCompanyId] } } });
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}).finally(async () => {
    await prisma.$disconnect();
});
