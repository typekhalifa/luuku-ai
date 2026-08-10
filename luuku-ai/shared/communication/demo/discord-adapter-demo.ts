import { DiscordChannelAdapter } from "../discord-adapter";

async function runDemo() {
    let request: { url: string; init?: RequestInit } | undefined;

    const adapter = new DiscordChannelAdapter(
        {
            botToken: "test-discord-token",
            defaultChannelId: "123456789",
            apiBaseUrl: "https://discord.test/api/v10",
        },
        async (url, init) => {
            request = { url, init };
            return new Response(
                JSON.stringify({
                    id: "discord-message-1",
                    channel_id: "123456789",
                    content: "Luuku briefing is ready.",
                }),
                {
                    status: 200,
                    headers: { "content-type": "application/json" },
                },
            );
        },
    );

    await adapter.send({
        conversationId: "founder-executive",
        recipient: {
            channel: "discord",
            externalId: "123456789",
            displayName: "Founder",
        },
        content: "Luuku briefing is ready.",
    });

    if (!request) {
        throw new Error("Discord adapter demo failed: no request captured");
    }

    if (request.init?.method !== "POST") {
        throw new Error("Discord adapter demo failed: expected POST request");
    }

    const headers = new Headers(request.init.headers);
    if (headers.get("authorization") !== "Bot test-discord-token") {
        throw new Error("Discord adapter demo failed: invalid authorization header");
    }

    if (request.url !== "https://discord.test/api/v10/channels/123456789/messages") {
        throw new Error(`Discord adapter demo failed: unexpected URL ${request.url}`);
    }

    const body = JSON.parse(String(request.init.body)) as { content?: string };
    if (body.content !== "Luuku briefing is ready.") {
        throw new Error("Discord adapter demo failed: message content mismatch");
    }

    console.log("");
    console.log("========================================");
    console.log("        DISCORD ADAPTER DEMO");
    console.log("========================================");
    console.log("");
    console.log(`Channel      : ${adapter.channel}`);
    console.log(`Method       : ${request.init?.method}`);
    console.log(`Endpoint     : ${request.url}`);
    console.log(`Authorization: Bot token injected`);
    console.log(`Message      : ${body.content}`);
    console.log("");
    console.log("Discord adapter contract passed.");
    console.log("");
}

runDemo().catch((error) => {
    console.error("Discord adapter demo failed:", error);
    process.exitCode = 1;
});
