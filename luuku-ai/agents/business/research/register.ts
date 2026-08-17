import { registerAgent } from "../../../shared/agents/registry";
import { AgentPresence } from "../../../shared/communication/agent-presence";

import { ResearchAgent } from "./research-agent";

const researchPresence: AgentPresence = {
    id: "research",
    name: "Research Agent",
    department: "research",
    role: "Research",
    autonomy: "interactive",
    defaultVisibility: "department",
    scope: {
        canReceiveFounderCommands: true,
        canInitiateToFounder: true,
        canCommunicateWithLex: true,
        canCommunicateWithAgents: true,
        canCommunicateExternally: false,
        allowedTargetDepartments: ["research", "sales", "operations"],
    },
};

registerAgent(
    new ResearchAgent(),
    researchPresence,
);
