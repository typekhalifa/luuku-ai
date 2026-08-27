import assert from "node:assert/strict";

import { Priority } from "../../task/priority";
import { WorkflowStatus } from "../workflow-status";
import { InMemoryWorkflowStore } from "../workflow-store";
import { Workflow } from "../workflow";

const createdAt = new Date("2026-08-27T10:00:00.000Z");

const workflow: Workflow = {
    id: "v6-workflow-store-demo",
    goal: "Persist Company X onboarding workflow state.",
    status: WorkflowStatus.READY,
    steps: [
        {
            id: "research-company",
            title: "Research Company X",
            description: "Controlled research step.",
            agentId: "research-agent",
            capability: "research.company",
            dependsOn: [],
            priority: Priority.HIGH,
            requiresApproval: false,
            status: "READY",
            input: { company: "Company X" },
        },
    ],
    requiresFounderApproval: false,
    createdAt,
    updatedAt: createdAt,
    metadata: { source: "v6-workflow-store-demo" },
};

async function main() {
    const store = new InMemoryWorkflowStore();

    console.log("");
    console.log("========================================");
    console.log("      V6 WORKFLOW STORE BOUNDARY DEMO");
    console.log("========================================");
    console.log("");

    const created = await store.create(workflow);
    const loaded = await store.get(workflow.id);

    assert.equal(created.id, workflow.id);
    assert.equal(loaded?.id, workflow.id);
    assert.equal(loaded?.steps[0]?.status, "READY");

    const updated = {
        ...loaded!,
        steps: loaded!.steps.map((step) => ({ ...step, status: "COMPLETED" as const })),
        updatedAt: new Date("2026-08-27T10:01:00.000Z"),
    };

    await store.save(updated);
    const resumed = await store.get(workflow.id);

    assert.equal(resumed?.steps[0]?.status, "COMPLETED");
    assert.equal(resumed?.updatedAt.toISOString(), "2026-08-27T10:01:00.000Z");

    console.log(`Created : ${created.id}`);
    console.log(`Loaded  : ${loaded?.id}`);
    console.log(`Resumed : ${resumed?.id}`);
    console.log(`Status  : ${resumed?.steps[0]?.status}`);
    console.log("");
    console.log("✓ Workflow state can be created behind a persistence boundary.");
    console.log("✓ Workflow state can be loaded independently of the runtime.");
    console.log("✓ Updated workflow state can be saved and recovered.");
    console.log("✓ Orchestration contracts remain independent of the storage implementation.");
    console.log("");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
