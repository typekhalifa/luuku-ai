import type {
    KnowledgeChunk,
    RetrievalResult,
} from "../types";

import type { EmbeddingProvider } from "../embeddings";
import type { VectorStore } from "../vector-store";
import type { SimilarityMetric } from "../similarity";

import type { Retriever } from "./retriever";

export class SimilarityRetriever
    implements Retriever {

    readonly name = "similarity";

    constructor(

        private readonly embeddings: EmbeddingProvider,

        private readonly vectorStore: VectorStore,

        private readonly metric: SimilarityMetric,

    ) {}

    async retrieve(
        query: string,
        limit = 5,
    ): Promise<RetrievalResult[]> {

        const queryChunk: KnowledgeChunk = {

            id: "__query__",

            documentId: "__query__",

            index: 0,

            content: query,

            tokens: 0,

            metadata: {},

        };

        const [queryEmbedding] =
            await this.embeddings.embed([
                queryChunk,
            ]);

        const storedVectors =
            await this.vectorStore.all();

        const ranked =
            storedVectors
                .map((vector) => ({

                    vector,

                    score: this.metric.compare(

                        queryEmbedding.vector,

                        vector.embedding.vector,

                    ),

                }))
                .sort(

                    (a, b) =>

                        b.score - a.score,

                )
                .slice(0, limit);

        return ranked.map(

            ({ vector, score }) => ({

                chunk: vector.chunk,

                score,

            }),

        );

    }

}