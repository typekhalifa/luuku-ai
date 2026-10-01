import {
    CommunicationChannelBinding,
    CommunicationSpace,
    bindingForChannel,
} from "./department-space";

export interface DiscordSpaceBinding {
    spaceId: string;
    channelId: string;
    channelName?: string;
}

export function resolveDiscordSpaceBinding(
    space: CommunicationSpace,
): DiscordSpaceBinding | undefined {
    const binding = bindingForChannel(space, "discord");

    if (!binding?.externalId) {
        return undefined;
    }

    return {
        spaceId: space.id,
        channelId: binding.externalId,
        channelName: binding.name,
    };
}

export function discordBinding(
    channelId: string,
    name?: string,
): CommunicationChannelBinding {
    const normalizedId = channelId.trim();

    if (!normalizedId) {
        throw new Error("Discord channel binding requires a channel id");
    }

    return {
        channel: "discord",
        externalId: normalizedId,
        name,
    };
}
