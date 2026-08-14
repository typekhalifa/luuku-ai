import fs from "node:fs";
import path from "node:path";

import {
    AgentTask,
    AgentResult,
} from "../../../shared/agents/interface";

function writeExecutionReceipt(task: AgentTask, completedAt: string): string {
    const directory = path.resolve(process.cwd(), "logs", "agent-executions");
    fs.mkdirSync(directory, { recursive: true });

    const filePath = path.join(directory, `research-${task.id}.json`);
    fs.writeFileSync(
        filePath,
        JSON.stringify(
            {
                agentId: "research",
                taskId: task.id,
                title: task.title,
                description: task.description,
                completedAt,
                executionStatus: "completed",
                executed: true,
                verification: {
                    verified: false,
                    reason:
                        "The Research Agent execution handler completed, but the requested business outcome has not yet been independently verified.",
                },
            },
            null,
            2,
        ),
        "utf8",
    );

    return filePath;
}

export async function executeResearchTask(
    task: AgentTask,
): Promise<AgentResult> {
    console.log("");
    console.log("========================================");
    console.log("        RESEARCH AGENT");
    console.log("========================================");
    console.log("");
    console.log(task.title);
    console.log(task.description);

    const completedAt = new Date().toISOString();
    const receiptPath = writeExecutionReceipt(task, completedAt);
    const receiptExists = fs.existsSync(receiptPath);

    return {
        success: true,
        summary: receiptExists
            ? `Research execution completed for "${task.title}". An execution receipt was persisted, but the requested business outcome still requires independent verification.`
            : `Research execution completed for "${task.title}", but the execution receipt could not be verified.`,
        completedAt,
        executionStatus: "completed",
        executed: true,
        verified: false,
        evidence: {
            provider: "luuku-internal-agent-runner",
            externalId: task.id,
            reference: receiptPath,
            details: {
                agentId: "research",
                receiptPersisted: receiptExists,
                taskTitle: task.title,
            },
        },
        verificationNotes: [
            "The agent execution itself completed successfully.",
            "The business outcome is not marked verified until a domain-specific verification step confirms the requested research work and its resulting artifacts or CRM changes.",
        ],
    };
}
