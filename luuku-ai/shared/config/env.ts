import "dotenv/config";

export const config = {
  appName: "Luuku AI",
  founder: "Jean D'Amour Hagabimana",
  version: "0.2.0",
  environment: process.env.NODE_ENV || "development",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
};