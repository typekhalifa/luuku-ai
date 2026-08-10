import path from "node:path";
import dotenv from "dotenv";

dotenv.config({
    path: path.resolve(__dirname, "../../../.env"),
});

export const config = {
    appName: "Luuku AI",
    founder: "Jean D'Amour Hagabimana",
    version: "0.7.0",
    environment: process.env.NODE_ENV || "development",

    openaiApiKey: process.env.OPENAI_API_KEY || "",
    openaiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    tavilyApiKey: process.env.TAVILY_API_KEY || "",
    discordBotToken: process.env.DISCORD_BOT_TOKEN || "",
    discordChannelId: process.env.DISCORD_CHANNEL_ID || "",
};
