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

export interface StructuredAIRequest<TSchema extends Record<string, unknown>> {
    prompt: string;
    schemaName: string;
    schema: TSchema;
    model?: string;
}

export async function requestAIStructured<TResponse>(
    request: StructuredAIRequest<Record<string, unknown>>,
): Promise<TResponse> {
    const response = await client.responses.create({
        model: request.model ?? config.openaiModel,
        input: request.prompt,
        text: {
            format: {
                type: "json_schema",
                name: request.schemaName,
                schema: request.schema,
                strict: true,
            },
        },
    });

    if (!response.output_text) {
        throw new Error(
            "The AI model returned an empty structured response.",
        );
    }

    try {
        return JSON.parse(response.output_text) as TResponse;
    } catch (error) {
        throw new Error(
            `The AI model returned invalid structured JSON: ${
                error instanceof Error ? error.message : "unknown error"
            }`,
        );
    }
}
