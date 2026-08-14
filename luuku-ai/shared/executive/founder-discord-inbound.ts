import { requestAI } from "../ai/client";
import { buildExecutiveContext } from "../../agents/executive-ai/brain";
import { DiscordChannelAdapter } from "../communication/discord-adapter";
import { DiscordGatewayListener, DiscordInboundGatewayMessage } from "../communication/discord-gateway";
import { PrismaCommunicationService } from "../communication/prisma-communication-service";
import { loadDiscordEnvironment } from "../communication/discord-config";

const FOUNDER_CONVERSATION_ID = "founder-executive";

export class FounderDiscordInboundService {
    private readonly communicationService = new PrismaCommunicationService();
    private readonly discord: ReturnType<typeof loadDiscordEnvironment>;
    private readonly adapter: DiscordChannelAdapter;

    constructor() {
        this.discord = loadDiscordEnvironment();
        this.adapter = new DiscordChannelAdapter({
            botToken: this.discord.botToken,
            defaultChannelId: this.discord.channelId,
        });
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

        const response = await requestAI({
            prompt: `
You are Lex, the Executive AI of Luuku AI.

You are speaking directly with the founder through the company's Discord executive channel.

Your role is to understand the founder's request using the authoritative executive context below and respond clearly.
Do not invent business facts. Use the provided context as runtime truth.
Do not claim an action was executed unless the context contains verified execution evidence.
If the founder is asking for an action that requires an agent execution, explain the intended next step rather than pretending it has already happened.

Founder message:
${message.content}

Recent persistent conversation:
${recentMessages}

Authoritative executive context:
${JSON.stringify(context, null, 2)}

Respond as Lex in a concise, executive style.
`,
            temperature: 0.2,
        });

        const outbound = await this.communicationService.sendMessage({
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
                source: "lex-founder-response",
                inReplyTo: message.id,
                inboundMessageId: inbound.id,
            },
        });

        await this.adapter.send({
            conversationId: FOUNDER_CONVERSATION_ID,
            recipient: {
                channel: "discord",
                externalId: this.discord.channelId,
                displayName: "Founder",
            },
            content: response,
            metadata: {
                externalMessageId: outbound.externalMessageId,
                source: "lex-founder-response",
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
