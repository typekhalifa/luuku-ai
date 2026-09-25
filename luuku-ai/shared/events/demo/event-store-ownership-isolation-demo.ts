import { InMemoryEventStore } from "../store/in-memory-event-store.js";

const companyA = { scope: "COMPANY" as const, companyId: "company-a" };
const companyB = { scope: "COMPANY" as const, companyId: "company-b" };

async function main(): Promise<void> {
    const storeA = new InMemoryEventStore(companyA);
    const storeB = new InMemoryEventStore(companyB);

    const eventA = {
        id: "event-a",
        type: "WORKFLOW_COMPLETED",
        category: "workflow",
        source: "company-a-runtime",
        timestamp: "2026-09-25T21:00:00.000Z",
        ownership: companyA,
        payload: { workflowId: "workflow-a" },
    };

    await storeA.append(eventA);

    if ((await storeA.getAll()).length !== 1) {
        throw new Error("Company A event was not persisted.");
    }

    if ((await storeB.getAll()).length !== 0) {
        throw new Error("Company B can see Company A events.");
    }

    let rejected = false;
    try {
        await storeB.append(eventA);
    } catch (error) {
        rejected =
            error instanceof Error &&
            error.message === "Event store ownership mismatch.";
    }

    if (!rejected) {
        throw new Error("Company B was able to append a Company A event.");
    }

    if ((await storeA.getByType("WORKFLOW_COMPLETED")).length !== 1) {
        throw new Error("Company A type-filtered event read failed.");
    }

    console.log("V8 generic event store ownership isolation validation");
    console.log("✓ Company A can read its own events.");
    console.log("✓ Company B cannot read Company A events.");
    console.log("✓ Company B cannot append Company A events.");
    console.log("✓ Event type reads remain ownership-scoped.");
    console.log("GENERIC EVENT STORE ISOLATION: PASS");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
