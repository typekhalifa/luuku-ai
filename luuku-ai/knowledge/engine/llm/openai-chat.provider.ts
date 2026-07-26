import {

    requestAI,

} from "../../../shared/ai/client";

import type {

    ChatProvider,

} from "./chat-provider";

import type {

    ChatRequest,

} from "./chat-request";

export class OpenAIChatProvider
    implements ChatProvider {

    readonly name = "openai";

    async answer(

        request: ChatRequest,

    ): Promise<string> {

        const prompt = [

            "You are Luuku AI.",

            "",

            "Answer ONLY using the supplied context.",

            "",

            "If the context is insufficient, say so honestly.",

            "",

            "====================",

            "CONTEXT",

            "====================",

            request.context,

            "",

            "====================",

            "QUESTION",

            "====================",

            request.question,

        ].join("\n");

        return requestAI({

            prompt,

            model: "gpt-5",

        });

    }

}

export const openAIChatProvider =
    new OpenAIChatProvider();