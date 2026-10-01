import { bootstrap } from "../../kernel/bootstrap";
import { startFounderDiscordInbound } from "../../executive/founder-discord-inbound";

async function main() {
    await bootstrap();

    console.log("");
    console.log("========================================");
    console.log("   LEX FOUNDER DISCORD INBOUND");
    console.log("========================================");
    console.log("");
    console.log("Listening for founder messages in the configured Discord channel...");
    console.log("Press Ctrl+C to stop.");

    await startFounderDiscordInbound();
}

void main().catch((error) => {
    console.error("Founder Discord inbound listener failed:", error);
    process.exitCode = 1;
});
