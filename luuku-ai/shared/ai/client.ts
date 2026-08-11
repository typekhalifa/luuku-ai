import OpenAI from "openai";
import { config } from "../config/env";

const client = new OpenAI({
    apiKey: config.openaiApiKey,
    timeout: 60_000,
    maxRetries: 2,
});

export interface AIRequest {
    prompt: string;
    model?: string;
    temperature?: number;
}

export async function requestAI(
    request: AIRequest,
): Promise<string> {
    const response = await client.responses.create({
        model: request.model ?? config.openaiModel,
        input: request.prompt,
    });

    if (!response.output_text) {
        throw new Error(
            "The AI model returned an empty response.",
        );
    }

    return response.output_text;
}
