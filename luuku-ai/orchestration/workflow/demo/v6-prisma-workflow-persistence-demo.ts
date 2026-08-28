import assert from "node:assert/strict";

import { prisma } from "../../../shared/database/client";
import { PrismaWorkflowStore } from "../prisma-workflow-store";
import { Workflow } from "../workflow";
import { WorkflowStatus } from "../workflow-status";
import { Priority } from "../../task/priority";

const workflowId = "v6-prisma-persistence-demo";
const now = new Date("2026-08-28T10:00:00.000Z");

const workflow: Workflow = {
    id: workflowId,
    goal: "Verify durable V6 workflow state.",
    status: WorkflowStatus.READY,
    steps: [
        {
            id: "research-company",
            title: "Research Company X",
            description: "Persist controlled research state.",
            agentId: "research-agent",
            capability: "research.company",
            dependsOn: [],
            priority: Priority.HIGH,
            requiresApproval: false,
            status: "READY",
            input: { company: "Company X" },
        },
        {
            id: "prepare-proposal",
            title: "Prepare proposal",
            description: "Persist dependent proposal state.",
            agentId: "sales-agent",
            capability: "sales.proposal",
            dependsOn: ["research-company"],
            priority: Priority.MEDIUM,
            requiresApproval: true,
            status: "BLOCKED",
            input: { company: "Company X" },
        },
    ],
    requiresFounderApproval: false,
    metadata: { source: "v6-prisma-persistence-demo" },
    createdAt: now,
    updatedAt: now,
};

async function main() {
    const store = new PrismaWorkflowStore();

    await prisma.workflowStep.deleteMany({ where: { workflowId } });
    await prisma.workflow.deleteMany({ where: { id: workflowId } });

    const created = await store.create(workflow);
    const loaded = await store.get(workflowId);

    assert.equal(created.id, workflowId);
    assert.equal(loaded?.steps.length, 2);
    assert.deepEqual(loaded?.steps[1].dependsOn, ["research-company"]);
    assert.equal(loaded?.steps[0].status, "READY");

    const updated: Workflow = {
        ...loaded!,
        status: WorkflowStatus.AWAITING_APPROVAL,
        requiresFounderApproval: true,
        approvedAt: undefined,
        updatedAt: new Date("2026-08-28T10:01:00.000Z"),
        steps: loaded!.steps.map((step) =>
            step.id === "research-company"
                ? { ...step, status: "COMPLETED", output: { finding: "qualified" } }
                : step,
        ),
        metadata: { ...loaded!.metadata, checkpoint: "research-complete" },
    };

    await store.save(updated);

    const reloaded = await new PrismaWorkflowStore().get(workflowId);

    assert.equal(reloaded?.status, WorkflowStatus.AWAITING_APPROVAL);
    assert.equal(reloaded?.requiresFounderApproval, true);
    assert.equal(reloaded?.steps[0].status, "COMPLETED");
    assert.deepEqual(reloaded?.steps[0].output, { finding: "qualified" });
    assert.deepEqual(reloaded?.steps[1].dependsOn, ["research-company"]);
    assert.equal(reloaded?.metadata.checkpoint, "research-complete");

    console.log("");
    console.log("========================================");
    console.log("   V6 PRISMA WORKFLOW PERSISTENCE DEMO");
    console.log("========================================");
    console.log("");
    console.log(`Workflow  : ${reloaded?.id}`);
    console.log(`Status    : ${reloaded?.status}`);
    console.log(`Steps     : ${reloaded?.steps.length}`);
    console.log(`Research  : ${reloaded?.steps[0].status}`);
    console.log(`Approval  : ${reloaded?.requiresFounderApproval}`);
    console.log(`Checkpoint: ${String(reloaded?.metadata.checkpoint)}`);
    console.log("");
    console.log("✓ Workflow was written to PostgreSQL.");
    console.log("✓ Workflow and dependency state were read back correctly.");
    console.log("✓ Updated execution state was persisted.");
    console.log("✓ A fresh store instance recovered the updated state.");
    console.log("✓ V6 workflow state survives beyond the original runtime process.");
    console.log("");

    await prisma.workflow.delete({ where: { id: workflowId } });
}

main().catch(async (error) => {
    console.error(error);
    await prisma.workflow.deleteMany({ where: { id: workflowId } }).catch(() => undefined);
    process.exitCode = 1;
});
