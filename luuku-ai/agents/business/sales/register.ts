import { registerAgent } from "../../../shared/agents/registry";
import { AgentPresence } from "../../../shared/communication/agent-presence";

import { SalesAgent } from "./sales-agent";

const salesPresence: AgentPresence = {
    id: "sales",
    name: "Sales Agent",
    department: "sales",
    role: "Sales",
    autonomy: "interactive",
    defaultVisibility: "department",
    scope: {
        canReceiveFounderCommands: true,
        canInitiateToFounder: true,
        canCommunicateWithLex: true,
        canCommunicateWithAgents: true,
        canCommunicateExternally: true,
        allowedTargetDepartments: ["research", "sales", "support", "operations"],
    },
};

registerAgent(
    new SalesAgent(),
    salesPresence,
);
