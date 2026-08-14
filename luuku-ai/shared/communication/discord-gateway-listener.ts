const DISCORD_GATEWAY_URL = "wss://gateway.discord.gg/?v=10&encoding=json";
const DISCORD_GATEWAY_VERSION = 10;
const DISCORD_INTENTS = 1 | 512 | 32768; // GUILDS | GUILD_MESSAGES | MESSAGE_CONTENT

export interface DiscordInboundGatewayMessage {
    id: string;
    channelId: string;
    authorId: string;
    authorName: string;
    content: string;
    timestamp: string;
}

interface DiscordGatewayPayload {
    op: number;
    d: unknown;
    s?: number | null;
    t?: string | null;
}

interface DiscordHelloPayload {
    heartbeat_interval: number;
}

interface DiscordReadyPayload {
    user?: {
        id?: string;
        username?: string;
    };
}

interface DiscordMessageCreatePayload {
    id?: string;
    channel_id?: string;
    content?: string;
    timestamp?: string;
    author?: {
        id?: string;
        username?: string;
        global_name?: string | null;
        bot?: boolean;
    };
}

export interface DiscordGatewayListenerOptions {
    botToken: string;
    channelId: string;
    onMessage: (message: DiscordInboundGatewayMessage) => Promise<void> | void;
}

/**
 * Minimal Discord Gateway listener for founder inbound messages.
 * Discord remains a transport adapter; executive logic belongs to onMessage.
 */
export class DiscordGatewayListener {
    private socket: WebSocket | null = null;
    private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private stopped = false;
    private botUserId: string | null = null;
    private sequence: number | null = null;
    private startPromise: Promise<void> | null = null;

    constructor(private readonly options: DiscordGatewayListenerOptions) {}

    async start(): Promise<void> {
        if (this.startPromise) {
            return this.startPromise;
        }

        this.stopped = false;
        this.startPromise = new Promise<void>((resolve, reject) => {
            let settled = false;

            const connect = () => {
                if (this.stopped) {
                    if (!settled) {
                        settled = true;
                        reject(new Error("Discord Gateway listener stopped before READY."));
                    }
                    return;
                }

                console.log("Connecting to Discord Gateway...");

                const socket = new WebSocket(DISCORD_GATEWAY_URL);
                this.socket = socket;

                socket.addEventListener("open", () => {
                    console.log("✓ Discord Gateway socket opened. Identifying bot...");
                });

                socket.addEventListener("message", (event) => {
                    void this.handlePayload(String(event.data), resolve, reject, () => {
                        settled = true;
                    });
                });

                socket.addEventListener("error", (event) => {
                    console.error("Discord Gateway socket error:", event);
                });

                socket.addEventListener("close", (event) => {
                    this.clearHeartbeat();
                    this.socket = null;

                    console.log(
                        `Discord Gateway connection closed (code ${event.code}, reason: ${event.reason || "none"}).`,
                    );

                    if (!this.stopped) {
                        this.scheduleReconnect(connect);
                    } else if (!settled) {
                        settled = true;
                        reject(new Error("Discord Gateway listener stopped before READY."));
                    }
                });
            };

            connect();
        }).finally(() => {
            this.startPromise = null;
        });

        return this.startPromise;
    }

    stop(): void {
        this.stopped = true;
        this.clearHeartbeat();

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.socket) {
            this.socket.close(1000, "Listener stopped");
            this.socket = null;
        }
    }

    private async handlePayload(
        raw: string,
        resolve: () => void,
        reject: (reason?: unknown) => void,
        markSettled: () => void,
    ): Promise<void> {
        let payload: DiscordGatewayPayload;

        try {
            payload = JSON.parse(raw) as DiscordGatewayPayload;
        } catch {
            console.warn("Ignoring invalid Discord Gateway payload.");
            return;
        }

        if (typeof payload.s === "number") {
            this.sequence = payload.s;
        }

        switch (payload.op) {
            case 10:
                await this.handleHello(payload.d, reject, markSettled);
                return;
            case 0:
                await this.handleDispatch(payload.t, payload.d, resolve, markSettled);
                return;
            case 1:
                this.sendHeartbeat();
                return;
            case 7:
                console.log("Discord Gateway requested reconnect.");
                this.socket?.close(1000, "Gateway requested reconnect");
                return;
            case 9:
                console.error("Discord Gateway invalid session.");
                this.socket?.close(4000, "Invalid session");
                return;
            default:
                return;
        }
    }

    private async handleHello(
        data: unknown,
        reject: (reason?: unknown) => void,
        markSettled: () => void,
    ): Promise<void> {
        const hello = data as DiscordHelloPayload;
        const interval = Number(hello?.heartbeat_interval);

        if (!Number.isFinite(interval) || interval <= 0) {
            markSettled();
            reject(new Error("Discord Gateway returned an invalid heartbeat interval."));
            this.socket?.close(4000, "Invalid heartbeat interval");
            return;
        }

        console.log("✓ Discord Gateway HELLO received. Identifying bot...");

        this.socket?.send(JSON.stringify({
            op: 2,
            d: {
                token: this.options.botToken,
                intents: DISCORD_INTENTS,
                properties: {
                    os: process.platform,
                    browser: "luuku-ai",
                    device: "luuku-ai",
                },
            },
        }));

        this.clearHeartbeat();
        this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), interval);
    }

    private async handleDispatch(
        type: string | null | undefined,
        data: unknown,
        resolve: () => void,
        markSettled: () => void,
    ): Promise<void> {
        if (type === "READY") {
            const ready = data as DiscordReadyPayload;
            this.botUserId = ready.user?.id ?? null;

            console.log(
                `✓ Discord Gateway READY. Lex is now listening for founder messages${
                    this.botUserId ? ` as ${ready.user?.username ?? "Lex"}` : ""
                }.`,
            );

            markSettled();
            resolve();
            return;
        }

        if (type !== "MESSAGE_CREATE") {
            return;
        }

        const message = data as DiscordMessageCreatePayload;
        const authorId = message.author?.id;
        const channelId = message.channel_id;
        const content = message.content?.trim();

        if (!authorId || !channelId || !message.id || !content) {
            return;
        }

        if (channelId !== this.options.channelId) {
            return;
        }

        if (message.author?.bot || authorId === this.botUserId) {
            return;
        }

        await this.options.onMessage({
            id: message.id,
            channelId,
            authorId,
            authorName:
                message.author?.global_name ||
                message.author?.username ||
                "Founder",
            content,
            timestamp: message.timestamp || new Date().toISOString(),
        });
    }

    private sendHeartbeat(): void {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            return;
        }

        this.socket.send(JSON.stringify({
            op: 1,
            d: this.sequence,
        }));
    }

    private clearHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    private scheduleReconnect(connect: () => void): void {
        if (this.reconnectTimer || this.stopped) {
            return;
        }

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            connect();
        }, 1_500);
    }
}

export { DISCORD_GATEWAY_VERSION, DISCORD_INTENTS };
