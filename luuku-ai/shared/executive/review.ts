import { AgentResult } from "../../shared/agents/interface";
import { buildExecutiveContext } from "../../agents/executive-ai/brain";

export async function runExecutiveReview(
    lastExecution?: AgentResult
) {
    const context = await buildExecutiveContext(lastExecution);

    console.log("");
    console.log("========================================");
    console.log("      EXECUTIVE REVIEW");
    console.log("========================================");
    console.log("");
    console.log("Generated:");
    console.log(context.generatedAt);
    console.log("");
    console.log("Current Time:");
    console.log(context.currentTime);
    console.log("");
    console.log("System Health:");
    console.log(context.systemHealth);
    console.log("");
    console.log("CRM");
    console.log("");
    console.log(`Companies   : ${context.crm.companies}`);
    console.log(`Contacts    : ${context.crm.contacts}`);
    console.log(`Deals       : ${context.crm.deals}`);
    console.log(`Activities  : ${context.crm.activities}`);
    console.log(`Timeline    : ${context.crm.timeline}`);
    console.log("");
    console.log("BUSINESS INSIGHTS");
    console.log("");
    console.log(`Pipeline Value     : $${context.insights.pipelineValue}`);
    console.log(`Active Deals       : ${context.insights.activeDeals}`);
    console.log(`Overdue Activities : ${context.insights.overdueActivities}`);
    console.log(`Top Priority       : ${context.insights.topPriorityCompany ?? "None"}`);
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

    if (lastExecution) {
        console.log("");
        console.log("LAST EXECUTION");
        console.log("");
        console.log(`Status   : ${lastExecution.executionStatus ?? "unknown"}`);
        console.log(`Executed : ${lastExecution.executed ?? false}`);
        console.log(`Verified : ${lastExecution.verified ?? false}`);
        console.log(`Summary  : ${lastExecution.summary}`);
    }

    return context;
}
