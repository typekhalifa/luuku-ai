import { CommunicationChannel } from "./channel";
import { AgentPresence } from "./agent-presence";

export type CommunicationSpaceKind =
    | "department"
    | "cross-department"
    | "restricted"
    | "system";

export interface CommunicationChannelBinding {
    channel: CommunicationChannel;
    externalId?: string;
    name?: string;
}

export interface CommunicationSpace {
    id: string;
    name: string;
    department: string;
    kind: CommunicationSpaceKind;
    members: string[];
    bindings: CommunicationChannelBinding[];
}

export function canJoinCommunicationSpace(
    presence: AgentPresence,
    space: CommunicationSpace,
): boolean {
    if (space.members.includes(presence.id)) {
        return true;
    }

    if (space.kind === "system") {
        return presence.scope.canCommunicateWithLex;
    }

    if (space.kind === "department") {
        return presence.department === space.department;
    }

    if (space.kind === "cross-department") {
        return presence.scope.canCommunicateWithAgents;
    }

    return false;
}

export function bindingForChannel(
    space: CommunicationSpace,
    channel: CommunicationChannel,
): CommunicationChannelBinding | undefined {
    return space.bindings.find((binding) => binding.channel === channel);
}
