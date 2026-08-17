import { AgentPresence } from "../communication/agent-presence";

export const lexPresence: AgentPresence = {
    id: "lex",
    name: "Lex",
    department: "executive",
    role: "Executive AI",
    autonomy: "autonomous",
    defaultVisibility: "founder",
    scope: {
        canReceiveFounderCommands: true,
        canInitiateToFounder: true,
        canCommunicateWithLex: false,
        canCommunicateWithAgents: true,
        canCommunicateExternally: false,
        allowedTargetDepartments: [
            "research",
            "sales",
            "development",
            "legal",
            "support",
            "finance",
            "hr",
            "operations",
        ],
    },
};
