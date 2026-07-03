import { buildExecutiveContext } from "../../agents/executive-ai/brain";

export function runExecutiveReview() {

    const context = buildExecutiveContext();

    console.log("");

    console.log("========================================");
    console.log("      EXECUTIVE REVIEW");
    console.log("========================================");

    console.log("");

    console.log("Generated:");

    console.log(context.generatedAt);

    console.log("");

    console.log("System Health:");

    console.log(context.systemHealth);

    console.log("");

    console.log("Available Agents:");

    console.log(context.availableAgents.join(", "));

    console.log("");

    console.log("Objectives:");

    console.log(context.objectives.length);

    console.log("");

    console.log("Previous Decisions:");

    console.log(context.memory.totalDecisions);

    console.log("");

    console.log("Active Agents:");

    console.log(context.agentHealth.length);

    return context;

}