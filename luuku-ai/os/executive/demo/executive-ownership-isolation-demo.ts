import { InMemoryExecutiveMemoryStore } from "../executive-memory.js";
import { InMemoryExecutiveObjectiveStore } from "../objective-engine.js";
import { ExecutiveInstitutionalMemory, InMemoryInstitutionalMemoryStore } from "../v8-l-institutional-memory.js";

const companyA = { scope: "COMPANY" as const, companyId: "company-a" };
const companyB = { scope: "COMPANY" as const, companyId: "company-b" };
const now = new Date("2026-09-25T21:00:00.000Z");

async function main(): Promise<void> {
const memoryA = new InMemoryExecutiveMemoryStore(companyA);
const memoryB = new InMemoryExecutiveMemoryStore(companyB);

await memoryA.save({
    id: "memory-a",
    ownership: companyA,
    eventType: "ACTION_COMPLETED",
    action: "outreach",
    outcome: "Completed.",
    success: true,
    lesson: "Use the validated outreach sequence.",
    createdAt: now,
});

if ((await memoryA.list()).length !== 1) throw new Error("Company A memory was not persisted.");
if ((await memoryB.list()).length !== 0) throw new Error("Company B can see Company A memory.");

await expectOwnershipFailure(
    () => memoryB.save({
        id: "memory-b-owned-by-a",
        ownership: companyA,
        eventType: "ACTION_FAILED",
        action: "outreach",
        outcome: "Failed.",
        success: false,
        createdAt: now,
    }),
    "memory",
);

const objectiveA = new InMemoryExecutiveObjectiveStore(companyA);
const objectiveB = new InMemoryExecutiveObjectiveStore(companyB);

await objectiveA.save({
    id: "objective-a",
    ownership: companyA,
    title: "Company A objective",
    description: "A private objective.",
    priority: "high",
    status: "ACTIVE",
    progress: 10,
    createdAt: now,
    updatedAt: now,
});

if ((await objectiveA.list()).length !== 1) throw new Error("Company A objective was not persisted.");
if ((await objectiveB.list()).length !== 0) throw new Error("Company B can see Company A objective.");

await expectOwnershipFailure(
    () => objectiveB.save({
        id: "objective-b-owned-by-a",
        ownership: companyA,
        title: "Cross-tenant objective",
        description: "Must be rejected.",
        priority: "high",
        status: "ACTIVE",
        progress: 0,
        createdAt: now,
        updatedAt: now,
    }),
    "objective",
);

const institutionalA = new InMemoryInstitutionalMemoryStore(companyA);
const institutionalB = new InMemoryInstitutionalMemoryStore(companyB);
const institutionalMemoryA = new ExecutiveInstitutionalMemory(institutionalA);
const institutionalMemoryB = new ExecutiveInstitutionalMemory(institutionalB);

await institutionalMemoryA.remember({
    id: "institutional-a",
    ownership: companyA,
    kind: "LESSON",
    subject: "outreach",
    statement: "The validated outreach sequence performs reliably.",
    confidence: 0.9,
    observedAt: now,
});

if ((await institutionalA.list()).length !== 1) throw new Error("Company A institutional memory was not persisted.");
if ((await institutionalB.list()).length !== 0) throw new Error("Company B can see Company A institutional memory.");

await expectOwnershipFailure(
    async () => {
        await institutionalMemoryB.remember({
            id: "institutional-b-owned-by-a",
            ownership: companyA,
            kind: "LESSON",
            subject: "cross-tenant",
            statement: "Must be rejected.",
            confidence: 0.9,
            observedAt: now,
        });
    },
    "institutional memory",
);

console.log("V8 Executive ownership isolation validation");
console.log("✓ Company A memory is readable only through Company A ownership.");
console.log("✓ Company B cannot write Company A executive memory.");
console.log("✓ Company A objectives are isolated from Company B.");
console.log("✓ Company B cannot write Company A executive objectives.");
console.log("✓ Company A institutional memory is isolated from Company B.");
console.log("✓ Company B cannot write Company A institutional memory.");
console.log("EXECUTIVE OWNERSHIP ISOLATION: PASS");
}

async function expectOwnershipFailure(
    operation: () => Promise<void>,
    label: string,
): Promise<void> {
    try {
        await operation();
    } catch (error) {
        if (error instanceof Error && error.message.toLowerCase().includes("ownership mismatch")) return;
        throw error;
    }

    throw new Error(`Expected ${label} ownership mismatch to be rejected.`);
}


main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
