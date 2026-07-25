import type {
    KnowledgeChunk,
    KnowledgeEmbedding,
} from "../types";

import type {
    EmbeddingProvider,
} from "./embedding.provider";

export class OpenAIEmbeddingProvider
    implements EmbeddingProvider {

    readonly name = "openai";

    async embed(
        chunks: KnowledgeChunk[],
    ): Promise<KnowledgeEmbedding[]> {

        const embeddings: KnowledgeEmbedding[] = [];

        for (const chunk of chunks) {

            embeddings.push({

                chunkId: chunk.id,

                model: "mock",

                dimensions: 3,

                vector: [

                    Math.random(),

                    Math.random(),

                    Math.random(),

                ],

                createdAt: new Date(),

            });

        }

        return embeddings;

    }

}

export const openAIEmbeddingProvider =
    new OpenAIEmbeddingProvider();