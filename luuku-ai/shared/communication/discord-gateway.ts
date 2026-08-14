export interface DiscordGatewayConfig {
    botToken: string;
    channelId: string;
    apiBaseUrl?: string;
    onMessage: (message: DiscordInboundGatewayMessage) => Promise<void>;
}

export interface DiscordInboundGatewayMessage {
    id: string;
    channelId: string;
    authorId: string;
    authorName: string;
    content: string;
    timestamp?: string;
}

type GatewayPayload = {
    op: number;
    d?: any;
    s?: number | null;
    t?: string | null;
};

const DISCORD_GATEWAY_VERSION = "10";
const GUILDS_INTENT = 1;
const GUILD_MESSAGES_INTENT = 512;
const MESSAGE_CONTENT_INTENT = 32768;

export class DiscordGatewayListener {
    private readonly apiBaseUrl: string;
    private socket: WebSocket | undefined;
    private heartbeatTimer: ReturnType<typeof setInterval> | undefined;
    private sequence: number | null = null;
    private botUserId: string | undefined;
    private stopped = false;

    constructor(private readonly config: DiscordGatewayConfig) {
        if (!config.botToken.trim()) {
            throw new Error("Discord gateway requires a bot token");
        }

        if (!config.channelId.trim()) {
            throw new Error("Discord gateway requires a channel id");
        }

        this.apiBaseUrl = (
            config.apiBaseUrl ?? "https://discord.com/api/v10"
        ).replace(/\/$/, "");
    }

    async start(): Promise<void> {
        this.stopped = false;

        const meResponse = await fetch(`${this.apiBaseUrl}/users/@me`, {
            headers: {
                Authorization: `Bot ${this.config.botToken}`,
            },
        });

        if (!meResponse.ok) {
            throw new Error(
                `Discord bot identity check failed (${meResponse.status} ${meResponse.statusText})`,
            );
        }

        const me = await meResponse.json() as { id?: string };
        this.botUserId = me.id;

        const response = await fetch(`${this.apiBaseUrl}/gateway`);
        if (!response.ok) {
            throw new Error(
                `Discord gateway discovery failed (${response.status} ${response.statusText})`,
            );
        }

        const payload = await response.json() as { url?: string };
        if (!payload.url) {
            throw new Error("Discord gateway discovery returned no URL");
        }

        const gatewayUrl = `${payload.url}?v=${DISCORD_GATEWAY_VERSION}&encoding=json`;
        this.socket = new WebSocket(gatewayUrl);

        this.socket.addEventListener("open", () => {
            this.identify();
        });

        this.socket.addEventListener("message", (event) => {
            void this.handleMessage(String(event.data));
        });

        this.socket.addEventListener("close", () => {
            this.stopHeartbeat();

            if (!this.stopped) {
                console.error("Discord gateway connection closed.");
            }
        });

        this.socket.addEventListener("error", () => {
            console.error("Discord gateway connection error.");
        });
    }

    stop(): void {
        this.stopped = true;
        this.stopHeartbeat();
        this.socket?.close();
        this.socket = undefined;
    }

    private identify(): void {
        this.send({
            op: 2,
            d: {
                token: this.config.botToken,
                intents:
                    GUILDS_INTENT |
                    GUILD_MESSAGES_INTENT |
                    MESSAGE_CONTENT_INTENT,
                properties: {
                    os: "linux",
                    browser: "luuku-ai",
                    device: "luuku-ai",
                },
            },
        });
    }

    private async handleMessage(raw: string): Promise<void> {
        let payload: GatewayPayload;

        try {
            payload = JSON.parse(raw) as GatewayPayload;
        } catch {
            return;
        }

        if (typeof payload.s === "number") {
            this.sequence = payload.s;
        }

        if (payload.op === 10) {
            this.startHeartbeat(payload.d?.heartbeat_interval);
            return;
        }

        if (payload.op === 11) {
            return;
        }

        if (payload.op !== 0 || payload.t !== "MESSAGE_CREATE") {
            return;
        }

        const message = payload.d;
        if (!message || message.channel_id !== this.config.channelId) {
            return;
        }

        if (message.author?.bot) {
            return;
        }

        if (!message.id || !message.author?.id || !message.content?.trim()) {
            return;
        }

        if (this.botUserId && message.author.id === this.botUserId) {
            return;
        }

        await this.config.onMessage({
            id: message.id,
            channelId: message.channel_id,
            authorId: message.author.id,
            authorName:
                message.author.global_name ||
                message.author.username ||
                message.author.id,
            content: message.content.trim(),
            timestamp: message.timestamp,
        });
    }

    private startHeartbeat(interval: unknown): void {
        this.stopHeartbeat();

        const heartbeatInterval =
            typeof interval === "number" && interval > 0
                ? interval
                : 45_000;

        const heartbeat = () => {
            this.send({
                op: 1,
                d: this.sequence,
            });
        };

        heartbeat();
        this.heartbeatTimer = setInterval(heartbeat, heartbeatInterval);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = undefined;
        }
    }

    private send(payload: unknown): void {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(payload));
        }
    }
}
