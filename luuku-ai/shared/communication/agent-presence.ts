export type AgentAutonomyLevel =
    | "interactive"
    | "autonomous"
    | "restricted"
    | "background";

export type CommunicationVisibility =
    | "founder"
    | "department"
    | "cross-department"
    | "system"
    | "external";

export type AgentCommunicationTarget =
    | "founder"
    | "lex"
    | "agent"
    | "external";

export interface AgentCommunicationScope {
    canReceiveFounderCommands: boolean;
    canInitiateToFounder: boolean;
    canCommunicateWithLex: boolean;
    canCommunicateWithAgents: boolean;
    canCommunicateExternally: boolean;
    allowedTargetDepartments?: string[];
}

export interface AgentPresence {
    id: string;
    name: string;
    department: string;
    role: string;
    autonomy: AgentAutonomyLevel;
    defaultVisibility: CommunicationVisibility;
    scope: AgentCommunicationScope;
    discordChannel?: string;
}

export function canCommunicate(
    presence: AgentPresence,
    target: AgentCommunicationTarget,
): boolean {
    switch (target) {
        case "founder":
            return presence.scope.canInitiateToFounder;
        case "lex":
            return presence.scope.canCommunicateWithLex;
        case "agent":
            return presence.scope.canCommunicateWithAgents;
        case "external":
            return presence.scope.canCommunicateExternally;
        default:
            return false;
    }
}
