import {
    DiscordChannelAdapter,
    DiscordGatewayListener,
    DiscordInboundGatewayMessage,
    loadDiscordEnvironment,
    ChannelCommunicationService,
    InMemoryChannelAdapterRegistry,
} from "../communication";

import { PrismaCommunicationService } from "../communication/prisma-communication-service";
import { buildExecutiveContext } from "../../agents/executive-ai/brain";
import { executeFounderCommand } from "./founder-command";

const FOUNDER_CONVERSATION_ID = "founder-executive";

export class FounderDiscordInboundService {
    private readonly communicationService: ChannelCommunicationService;
    private readonly discord: ReturnType<typeof loadDiscordEnvironment>;

    constructor() {
        this.discord = loadDiscordEnvironment();

        const adapterRegistry = new InMemoryChannelAdapterRegistry();
        adapterRegistry.register(
            new DiscordChannelAdapter({
                botToken: this.discord.botToken,
                defaultChannelId: this.discord.channelId,
            }),
        );

        this.communicationService = new ChannelCommunicationService(
            new PrismaCommunicationService(),
            adapterRegistry,
        );
    }

    async handle(message: DiscordInboundGatewayMessage): Promise<void> {
        const inbound = await this.communicationService.receiveMessage({
            channel: "discord",
            conversationId: FOUNDER_CONVERSATION_ID,
            externalConversationId: `discord:founder:${this.discord.channelId}`,
            sender: {
                channel: "discord",
                externalId: message.authorId,
                displayName: message.authorName,
            },
            content: message.content,
            metadata: {
                provider: "discord",
                externalMessageId: message.id,
                channelId: message.channelId,
                timestamp: message.timestamp,
                source: "founder-discord-inbound",
            },
        });

        const context = await buildExecutiveContext();
        const conversation = await this.communicationService.getConversation(
            FOUNDER_CONVERSATION_ID,
        );

        const recentMessages = conversation?.messages
            .slice(-12)
            .map((item) => `${item.direction}: ${item.content}`)
            .join("\n") || inbound.content;

        const commandResult = await executeFounderCommand({
            message: message.content,
            recentConversation: recentMessages,
        });

        const response = commandResult.response || JSON.stringify(context, null, 2);

        await this.communicationService.sendMessage({
            conversationId: FOUNDER_CONVERSATION_ID,
            channel: "discord",
            recipient: {
                channel: "discord",
                externalId: this.discord.channelId,
                displayName: "Founder",
            },
            content: response,
            metadata: {
                provider: "discord",
                source: commandResult.executed
                    ? "lex-founder-command-execution"
                    : "lex-founder-response",
                inReplyTo: message.id,
                inboundMessageId: inbound.id,
                executionStatus: commandResult.result?.executionStatus,
                executed: commandResult.executed,
                verified: commandResult.result?.verified,
                assignedAgentId: commandResult.decision?.assignedAgentId,
            },
        });
    }
}

export async function startFounderDiscordInbound(): Promise<DiscordGatewayListener> {
    const service = new FounderDiscordInboundService();
    const discord = loadDiscordEnvironment();

    const listener = new DiscordGatewayListener({
        botToken: discord.botToken,
        channelId: discord.channelId,
        onMessage: (message) => service.handle(message),
    });

    await listener.start();
    return listener;
}
