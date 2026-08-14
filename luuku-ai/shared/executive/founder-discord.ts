import {
    DiscordChannelAdapter,
    FounderCommunication,
    InMemoryChannelAdapterRegistry,
    ChannelCommunicationService,
} from "../communication";

import { PrismaCommunicationService } from "../communication/prisma-communication-service";
import { loadDiscordEnvironment } from "../communication/discord-config";

export function createFounderDiscordCommunication(): FounderCommunication {
    const discord = loadDiscordEnvironment();

    const adapterRegistry = new InMemoryChannelAdapterRegistry();

    adapterRegistry.register(
        new DiscordChannelAdapter({
            botToken: discord.botToken,
            defaultChannelId: discord.channelId,
        }),
    );

    const communicationStore = new PrismaCommunicationService();

    const communicationService = new ChannelCommunicationService(
        communicationStore,
        adapterRegistry,
    );

    return new FounderCommunication({
        communicationService,
        channel: "discord",
        recipient: {
            channel: "discord",
            externalId: discord.channelId,
            displayName: "Founder",
        },
    });
}
