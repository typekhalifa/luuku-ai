import {
    CommunicationChannel,
    ChannelIdentity,
} from "./channel";
import {
    CommunicationSpace,
    bindingForChannel,
} from "./department-space";
import { InboundChannelMessage, OutboundChannelMessage } from "./channel-adapter";

export interface DiscordSpaceResolution {
    space: CommunicationSpace;
    bindingExternalId: string;
}

export function resolveDiscordSpace(
    spaces: CommunicationSpace[],
    channelId: string,
): DiscordSpaceResolution | undefined {
    for (const space of spaces) {
        const binding = bindingForChannel(space, "discord");

        if (binding?.externalId === channelId) {
            return {
                space,
                bindingExternalId: channelId,
            };
        }
    }

    return undefined;
}

export function normalizeDiscordInboundToSpace(
    spaces: CommunicationSpace[],
    message: InboundChannelMessage,
): InboundChannelMessage & { spaceId?: string } {
    if (message.channel !== "discord") {
        throw new Error(
            `Discord space bridge cannot normalize channel: ${message.channel}`,
        );
    }

    const channelId = message.metadata?.discordChannelId;
    if (typeof channelId !== "string" || !channelId) {
        return message;
    }

    const resolved = resolveDiscordSpace(spaces, channelId);

    if (!resolved) {
        return message;
    }

    return {
        ...message,
        spaceId: resolved.space.id,
        metadata: {
            ...message.metadata,
            communicationSpaceId: resolved.space.id,
            communicationSpaceName: resolved.space.name,
        },
    };
}

export function discordRecipientForSpace(
    space: CommunicationSpace,
    recipient: ChannelIdentity,
): OutboundChannelMessage {
    const binding = bindingForChannel(space, "discord");

    if (!binding?.externalId) {
        throw new Error(
            `Communication space ${space.id} has no Discord channel binding`,
        );
    }

    return {
        conversationId: space.id,
        recipient: {
            channel: "discord" as CommunicationChannel,
            externalId: binding.externalId,
            displayName: binding.name ?? space.name,
        },
        content: "",
        metadata: {
            communicationSpaceId: space.id,
            communicationSpaceName: space.name,
            requestedRecipient: recipient.externalId,
        },
    };
}
