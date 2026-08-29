import assert from "node:assert/strict";

import { AgentResult } from "../../../shared/agents/interface";
import { registerAgent } from "../../../shared/agents/registry";
import { Priority } from "../../task/priority";
import { PrismaQueueStore } from "../../queue/prisma-queue-store";
import { QueueScheduler } from "../../scheduler/scheduler";
import { PrismaWorkflowStore } from "../prisma-workflow-store";
import { Workflow } from "../workflow";
import { WorkflowStatus } from "../workflow-status";
import { WorkflowOrchestrator } from "../workflow-orchestrator";
import { SharedAgentWorkflowExecutor } from "../shared-agent-workflow-executor";
import { AutonomousRuntime } from "../autonomous-runtime";

const workflowId = "v6-persistent-runtime-demo";
const executed: string[] = [];

registerAgent({
    id: "v6-persistent-runtime-agent",
    name: "V6 Persistent Runtime Agent",
    role: "controlled autonomous runtime integration agent",
    async execute(task): Promise<AgentResult> {
        executed.push(task.id);
        return {
            success: true,
            summary: `Controlled agent completed ${task.id}.`,
            completedAt: new Date().toISOString(),
            executionStatus: "completed",
            executed: true,
            verified: true,
            evidence: {
                provider: "controlled-v6-agent",
                externalId: task.id,
                details: { networkRequestMade: false },
            },
        };
    },
});

const now = new Date("2026-08-29T09:00:00.000Z");

const workflow: Workflow = {
    id: workflowId,
    goal: "Complete a durable two-step onboarding workflow.",
    status: WorkflowStatus.READY,
    steps: [
        {
            id: "research-company",
            title: "Research Company X",
            description: "Perform controlled research.",
            agentId: "v6-persistent-runtime-agent",
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
            description: "Prepare the proposal after research.",
            agentId: "v6-persistent-runtime-agent",
            capability: "sales.proposal",
            dependsOn: ["research-company"],
            priority: Priority.MEDIUM,
            requiresApproval: false,
            status: "BLOCKED",
            input: { company: "Company X" },
        },
    ],
    requiresFounderApproval: false,
    metadata: { source: "v6-persistent-autonomous-runtime-demo" },
    createdAt: now,
    updatedAt: now,
};

async function main() {
    const workflowStore = new PrismaWorkflowStore();
    const queueStore = new PrismaQueueStore();

    await queueStore.get(`${workflowId}:prepare-proposal`).then(async (item) => {
        if (item) await queueStore.fail(item.id, now);
    }).catch(() => undefined);
    await queueStore.get(`${workflowId}:research-company`).then(async (item) => {
        if (item) await queueStore.fail(item.id, now);
    }).catch(() => undefined);
    await workflowStore.get(workflowId).then(async (existing) => {
        if (existing) {
            // The persistence demo owns this deterministic workflow ID.
            // Cleanup is performed below by direct Prisma calls through the stores' backing DB.
        }
    });

    const { prisma } = await import("../../../shared/database/client.js");
    await prisma.queueItem.deleteMany({ where: { workflowId } });
    await prisma.workflow.deleteMany({ where: { id: workflowId } });

    await workflowStore.create(workflow);

    const buildRuntime = () =>
        new AutonomousRuntime(
            new QueueScheduler(new PrismaQueueStore()),
            new PrismaQueueStore(),
            new WorkflowOrchestrator(undefined, new SharedAgentWorkflowExecutor()),
            new PrismaWorkflowStore(),
        );

    const first = await buildRuntime().runPersistedCycle(workflowId, now);
    const afterFirst = await new PrismaWorkflowStore().get(workflowId);
    const firstQueue = await new PrismaQueueStore().get(`${workflowId}:research-company`);

    assert.deepEqual(first.executed, [`research-company`]);
    assert.deepEqual(first.completed, [`${workflowId}:research-company`]);
    assert.equal(afterFirst?.steps.find((step) => step.id === "research-company")?.status, "COMPLETED");
    assert.equal(firstQueue?.status, "COMPLETED");
    assert.equal(firstQueue?.attempts, 1);

    // Simulate a runtime restart: construct a completely new runtime and load only by workflow ID.
    const second = await buildRuntime().runPersistedCycle(
        workflowId,
        new Date("2026-08-29T09:01:00.000Z"),
    );

    const recovered = await new PrismaWorkflowStore().get(workflowId);
    const secondQueue = await new PrismaQueueStore().get(`${workflowId}:prepare-proposal`);

    assert.deepEqual(second.executed, ["prepare-proposal"]);
    assert.deepEqual(second.completed, [`${workflowId}:prepare-proposal`]);
    assert.equal(recovered?.steps.find((step) => step.id === "prepare-proposal")?.status, "COMPLETED");
    assert.equal(secondQueue?.status, "COMPLETED");
    assert.equal(secondQueue?.attempts, 1);
    assert.deepEqual(executed, ["research-company", "prepare-proposal"]);

    console.log("");
    console.log("========================================");
    console.log(" V6 PERSISTENT AUTONOMOUS RUNTIME DEMO");
    console.log("========================================");
    console.log("");
    console.log(`Workflow : ${recovered?.id}`);
    console.log(`First run: ${first.executed.join(", ")}`);
    console.log(`Restart  : fresh runtime instance`);
    console.log(`Second run: ${second.executed.join(", ")}`);
    console.log(`Research : ${recovered?.steps.find((step) => step.id === "research-company")?.status}`);
    console.log(`Proposal : ${recovered?.steps.find((step) => step.id === "prepare-proposal")?.status}`);
    console.log("");
    console.log("✓ Runtime scheduled and claimed work through the persistent queue.");
    console.log("✓ Agent execution advanced workflow state.");
    console.log("✓ Workflow state was persisted before queue completion.");
    console.log("✓ A fresh runtime recovered the workflow after the restart boundary.");
    console.log("✓ The dependent step became runnable and completed exactly once.");
    console.log("✓ No external provider or network request was used.");
    console.log("");

    await prisma.queueItem.deleteMany({ where: { workflowId } });
    await prisma.workflow.delete({ where: { id: workflowId } });
}

main().catch(async (error) => {
    console.error(error);
    const { prisma } = await import("../../../shared/database/client.js");
    await prisma.queueItem.deleteMany({ where: { workflowId } }).catch(() => undefined);
    await prisma.workflow.deleteMany({ where: { id: workflowId } }).catch(() => undefined);
    process.exitCode = 1;
});
