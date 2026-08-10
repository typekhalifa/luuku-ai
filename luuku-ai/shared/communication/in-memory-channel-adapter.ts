import {
    ChannelAdapterRegistry,
    CommunicationChannelAdapter,
    InboundChannelMessage,
    OutboundChannelMessage,
} from "./channel-adapter";
import { CommunicationChannel } from "./channel";

export class InMemoryChannelAdapter
    implements CommunicationChannelAdapter
{
    readonly channel: CommunicationChannel = "internal";

    readonly sent: OutboundChannelMessage[] = [];

    async send(message: OutboundChannelMessage): Promise<void> {
        this.sent.push(message);
    }

    async normalizeInbound(
        message: InboundChannelMessage,
    ): Promise<InboundChannelMessage> {
        return {
            ...message,
            channel: this.channel,
        };
    }
}

export class InMemoryChannelAdapterRegistry
    implements ChannelAdapterRegistry
{
    private readonly adapters = new Map<
        CommunicationChannel,
        CommunicationChannelAdapter
    >();

    register(adapter: CommunicationChannelAdapter): void {
        this.adapters.set(adapter.channel, adapter);
    }

    get(channel: CommunicationChannel): CommunicationChannelAdapter | null {
        return this.adapters.get(channel) ?? null;
    }
}
