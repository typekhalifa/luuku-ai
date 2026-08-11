import { buildExecutiveInsights } from "../../shared/executive/insights";
import { buildAgentHealth } from "../../shared/executive/health";
import { buildExecutiveIntelligence } from "../../shared/executive/intelligence";
import { buildExecutiveMemory } from "../../shared/executive/memory";
import { getAgents } from "../../shared/agents/registry";
import { buildExecutiveObjectives } from "../../shared/executive/objectives";
import { buildExecutiveSchedule } from "../../shared/executive/scheduler";
import { buildExecutiveCRM } from "../../shared/executive/crm";
import { AgentResult } from "../../shared/agents/interface";

export interface ExecutiveContext {
    generatedAt: string;
    currentTime: string;
    intelligence: Awaited<ReturnType<typeof buildExecutiveIntelligence>>;
    memory: ReturnType<typeof buildExecutiveMemory>;
    agentHealth: ReturnType<typeof buildAgentHealth>;
    objectives: ReturnType<typeof buildExecutiveObjectives>;
    crm: Awaited<ReturnType<typeof buildExecutiveCRM>>;
    schedule: ReturnType<typeof buildExecutiveSchedule>;
    insights: Awaited<ReturnType<typeof buildExecutiveInsights>>;
    availableAgents: string[];
    systemHealth: "excellent" | "good" | "warning" | "critical";
    lastExecution?: AgentResult;
}

export async function buildExecutiveContext(
    lastExecution?: AgentResult
): Promise<ExecutiveContext> {
    const agentHealth = buildAgentHealth();
    const intelligence = await buildExecutiveIntelligence();
    const memory = buildExecutiveMemory();

    let systemHealth: ExecutiveContext["systemHealth"] = "excellent";
    if (intelligence.analytics.overdueTasks > 0) systemHealth = "good";
    if (intelligence.analytics.overdueTasks > 5) systemHealth = "warning";
    if (intelligence.analytics.overdueTasks > 10) systemHealth = "critical";

    const objectives = buildExecutiveObjectives();
    const crm = await buildExecutiveCRM();
    const schedule = buildExecutiveSchedule();
    const insights = await buildExecutiveInsights();

    return {
        generatedAt: new Date().toISOString(),
        currentTime: new Date().toISOString(),
        intelligence,
        memory,
        objectives,
        agentHealth,
        crm,
        schedule,
        insights,
        availableAgents: getAgents().map(agent => agent.name),
        systemHealth,
        lastExecution,
    };
}
