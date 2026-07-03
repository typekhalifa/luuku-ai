import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();



const client = new OpenAI({

    apiKey: process.env.OPENAI_API_KEY

});

export async function requestAI(
    prompt: string
): Promise<string> {

    const response = await client.responses.create({

        model: "gpt-5",

        input: prompt

    });

    if (!response.output_text) {

        throw new Error(
            "The AI model returned an empty response."
        );

    }

    return response.output_text;

}