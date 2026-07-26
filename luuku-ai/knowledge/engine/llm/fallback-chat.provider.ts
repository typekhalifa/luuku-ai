import type {
    ChatProvider,
} from "./chat-provider";

import type {
    ChatRequest,
} from "./chat-request";

export class FallbackChatProvider
    implements ChatProvider {

    readonly name = "fallback";

    async answer(
        request: ChatRequest,
    ): Promise<string> {

        return [

            "OpenAI is currently unavailable.",

            "",

            "Question:",

            request.question,

            "",

            "Retrieved Context:",

            request.context,

            "",

            "Fallback mode completed successfully.",

        ].join("\n");

    }

}

export const fallbackChatProvider =
    new FallbackChatProvider();