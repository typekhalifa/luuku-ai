import crypto from "node:crypto";
import { prisma } from "../../database/client.js";
import { recordObservabilityEvent, listCompanyObservabilityEvents, getCompanyObservabilitySummary } from "../durable-events.js";

function assert(condition: boolean, message: string): void {
    if (!condition) throw new Error(`V8.11 OBSERVABILITY ASSERTION FAILED: ${message}`);
}

async function main(): Promise<void> {
    const companyA = crypto.randomUUID();
    const companyB = crypto.randomUUID();
    const workflowId = crypto.randomUUID();
    const executionId = crypto.randomUUID();

    try {
        await prisma.company.createMany({
            data: [
                { id: companyA, name: `V8.11 Observability A ${companyA.slice(0, 8)}`, industry: "Testing", country: "Rwanda", status: "prospect", confidence: 100, verified: true, source: "V8.11" },
                { id: companyB, name: `V8.11 Observability B ${companyB.slice(0, 8)}`, industry: "Testing", country: "Rwanda", status: "prospect", confidence: 100, verified: true, source: "V8.11" },
            ],
        });

        await recordObservabilityEvent({
            eventType: "execution.started",
            source: "v8.11-demo",
            ownership: { scope: "COMPANY", companyId: companyA },
            executionId,
            workflowId,
            severity: "INFO",
            status: "executing",
            metadata: { safe: true },
        });
        await recordObservabilityEvent({
            eventType: "execution.failed",
            source: "v8.11-demo",
            ownership: { scope: "COMPANY", companyId: companyA },
            executionId,
            workflowId,
            severity: "ERROR",
            status: "failed",
            metadata: { reason: "synthetic-test" },
        });
        await recordObservabilityEvent({
            eventType: "execution.started",
            source: "v8.11-demo",
            ownership: { scope: "COMPANY", companyId: companyB },
            executionId: crypto.randomUUID(),
            workflowId: crypto.randomUUID(),
        });

        const eventsA = await listCompanyObservabilityEvents({ companyId: companyA, workflowId });
        assert(eventsA.length === 2, "company A can query its own durable events");
        assert(eventsA.every((event) => event.companyId === companyA), "company A results are tenant-scoped");
        assert(!eventsA.some((event) => event.companyId === companyB), "company A cannot see company B events");

        const summary = await getCompanyObservabilitySummary(companyA, new Date(Date.now() - 60_000), new Date(Date.now() + 60_000));
        assert(summary.total === 2, "summary counts only company A events");
        assert(summary.errors === 1, "summary counts company A errors");

        let failedClosed = false;
        try {
            await listCompanyObservabilityEvents({ companyId: "", workflowId });
        } catch {
            failedClosed = true;
        }
        assert(failedClosed, "missing tenant context fails closed");

        console.log("✓ durable observability events persist");
        console.log("✓ execution/workflow correlation is queryable");
        console.log("✓ tenant A cannot read tenant B observability events");
        console.log("✓ summary aggregates are tenant-scoped");
        console.log("✓ missing tenant context fails closed");
        console.log("");
        console.log("V8.11 durable observability validation: PASS");
    } finally {
        await prisma.observabilityEvent.deleteMany({ where: { companyId: { in: [companyA, companyB] } } });
        await prisma.company.deleteMany({ where: { id: { in: [companyA, companyB] } } });
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}).finally(async () => {
    await prisma.$disconnect();
});
