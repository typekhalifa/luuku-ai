import type {
    ChatRequest,
} from "./chat-request";

export interface ChatProvider {

    readonly name: string;

    answer(
        request: ChatRequest,
    ): Promise<string>;

}