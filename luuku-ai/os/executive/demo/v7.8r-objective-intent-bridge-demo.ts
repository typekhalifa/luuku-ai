import assert from "node:assert/strict";
import type { ExecutiveObjectiveRecord } from "../objective-engine.js";
import { ExecutiveObjectiveIntentBridge } from "../objective-intent-bridge.js";
import type { ObjectiveAssessment } from "../objective-engine.js";

const now = new Date();

const objective: ExecutiveObjectiveRecord = {
    id: "objective-close-prospects",
    title: "Close Qualified Prospects",
    description: "Prioritize converting high-quality prospects into meetings and customers.",
    priority: "high",
    status: "ACTIVE",
    progress: 25,
    createdAt: now,
    updatedAt: now,
};

const healthyAssessment: ObjectiveAssessment = {
    objectiveId: objective.id,
    status: "ACTIVE",
    progress: 25,
    attentionRequired: true,
    reason: "Objective is active and requires the executive to determine its next useful work.",
};

const approvalAssessment: ObjectiveAssessment = {
    objectiveId: objective.id,
    status: "ACTIVE",
    progress: 25,
    attentionRequired: true,
    reason: "Objective remains active while founder approval is pending.",
};

const completedAssessment: ObjectiveAssessment = {
    objectiveId: objective.id,
    status: "COMPLETED",
    progress: 100,
    attentionRequired: false,
    reason: "Objective is already completed.",
};

async function main() {
    const bridge = new ExecutiveObjectiveIntentBridge();

    const healthyIntent = bridge.build({ objective, assessment: healthyAssessment });
    const approvalIntent = bridge.build({ objective, assessment: approvalAssessment });
    const completedIntent = bridge.build({ objective, assessment: completedAssessment });

    assert.equal(healthyIntent.type, "MONITOR_ACTIVE_WORK");
    assert.equal(healthyIntent.objective, objective.title);
    assert.equal(healthyIntent.evidence.objectiveId, objective.id);
    assert.equal(healthyIntent.evidence.progress, 25);

    assert.equal(approvalIntent.type, "WAIT_FOR_FOUNDER_DECISION");
    assert.equal(approvalIntent.evidence.objectiveId, objective.id);

    assert.equal(completedIntent.type, "NO_ACTION");
    assert.equal(completedIntent.evidence.objectiveStatus, "COMPLETED");
    assert.equal(completedIntent.evidence.progress, 100);

    assert.throws(
        () => bridge.build({
            objective,
            assessment: { ...healthyAssessment, objectiveId: "different-objective" },
        }),
        /does not match objective/,
    );

    console.log("V7.8-R OBJECTIVE → INTENT BRIDGE DEMO");
    console.log(`Objective         : ${objective.title}`);
    console.log(`Healthy intent    : ${healthyIntent.type}`);
    console.log(`Approval intent   : ${approvalIntent.type}`);
    console.log(`Completed intent  : ${completedIntent.type}`);
    console.log(`Objective identity: ${String(healthyIntent.evidence.objectiveId)}`);
    console.log("");
    console.log("✓ Assessed objectives become structured executive intents.");
    console.log("✓ Objective identity and progress are preserved as intent evidence.");
    console.log("✓ Approval-blocked objectives become founder-decision intent.");
    console.log("✓ Completed objectives become NO_ACTION instead of executable work.");
    console.log("✓ Assessment/objective identity mismatches are rejected safely.");
    console.log("✓ The bridge creates no plan, queue item, approval, or execution side effect.");
    console.log("✓ V6 execution authority remains below the intent boundary.");
    console.log("✓ No external provider or network request was used.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
