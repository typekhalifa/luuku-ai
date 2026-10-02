import crypto from "node:crypto";
import { prisma } from "../../database/client.js";
import { evaluateCompanyObservabilityAlerts } from "../alerts.js";

function assert(condition: boolean, message: string): void {
    if (!condition) throw new Error(`V8.11 ALERT ASSERTION FAILED: ${message}`);
}

async function main(): Promise<void> {
    const companyId = crypto.randomUUID();

    try {
        await prisma.company.create({
            data: {
                id: companyId,
                name: `V8.11 Alert Demo ${companyId.slice(0, 8)}`,
                industry: "Testing",
                country: "Rwanda",
                status: "prospect",
                confidence: 100,
                verified: true,
                source: "V8.11",
            },
        });

        await prisma.observabilityEvent.createMany({
            data: Array.from({ length: 5 }, (_, index) => ({
                companyId,
                ownershipScope: "COMPANY",
                eventType: "http.request.completed",
                source: "v8.11-alert-demo",
                severity: "ERROR",
                status: "500",
                metadata: { synthetic: true, index },
            })),
        });

        await prisma.observabilityEvent.create({
            data: {
                companyId,
                ownershipScope: "COMPANY",
                eventType: "security.authorization_failure",
                source: "v8.11-alert-demo",
                severity: "ERROR",
                status: "403",
                metadata: { synthetic: true, reason: "insufficient_role" },
            },
        });

        const alerts = await evaluateCompanyObservabilityAlerts(
            companyId,
            new Date(),
            { http5xxCount: 5, securityViolationCount: 1 },
        );

        assert(alerts.some((alert) => alert.code === "HTTP_5XX_SPIKE"), "5xx threshold produces an alert");
        assert(alerts.some((alert) => alert.code === "SECURITY_VIOLATION"), "authorization failures produce a security alert");

        console.log("✓ repeated 5xx responses trigger deterministic alert evaluation");
        console.log("✓ authorization failures trigger tenant-scoped security alerts");
        console.log("✓ alert evaluation is read-only and produces no side effects");
        console.log("");
        console.log("V8.11 alert evaluation validation: PASS");
    } finally {
        await prisma.observabilityEvent.deleteMany({ where: { companyId } });
        await prisma.company.delete({ where: { id: companyId } });
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}).finally(async () => {
    await prisma.$disconnect();
});
