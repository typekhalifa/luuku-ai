import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const client = new OpenAI({

    apiKey: process.env.OPENAI_API_KEY

});

export interface AIRequest {

    prompt: string;

    model?: string;

    temperature?: number;

}

export async function requestAI(

    request: AIRequest

): Promise<string> {

    const response = await client.responses.create({

        model:

            request.model ?? "gpt-5",

        input:

            request.prompt

    });

    if (!response.output_text) {

        throw new Error(

            "The AI model returned an empty response."

        );

    }

    return response.output_text;

}