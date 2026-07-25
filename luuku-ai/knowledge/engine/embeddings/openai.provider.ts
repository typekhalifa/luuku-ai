import type {
    KnowledgeChunk,
    KnowledgeEmbedding,
} from "../types";

import type { EmbeddingProvider } from "./embedding.provider";

export class OpenAIEmbeddingProvider
    implements EmbeddingProvider {

    readonly name = "openai";

    async embed(
        chunks: KnowledgeChunk[]
    ): Promise<KnowledgeEmbedding[]> {

        return [];

    }

}

export const openAIEmbeddingProvider =
    new OpenAIEmbeddingProvider();