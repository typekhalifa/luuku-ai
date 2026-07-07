import { requestAI } from "./client";
import { ExecutiveContext } from "../../agents/executive-ai/brain";
import { buildExecutivePrompt } from "../../agents/executive-ai/prompt";

export async function requestExecutiveReasoning(

    context: ExecutiveContext

): Promise<string> {

    const prompt =

        buildExecutivePrompt(context);

    return requestAI({

        prompt,

        temperature: 0.2

    });

}