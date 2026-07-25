import type {
    KnowledgeEmbedding,
    RetrievalResult,
} from "../types";

import type { VectorStore } from "./vector-store";

export class InMemoryVectorStore
    implements VectorStore {

    readonly name = "memory";

    async store(
        embeddings: KnowledgeEmbedding[]
    ): Promise<void> {

    }

    async search(
        queryEmbedding: number[],
        limit = 5
    ): Promise<RetrievalResult[]> {

        return [];

    }

    async delete(
        ids: string[]
    ): Promise<void> {

    }

    async clear(): Promise<void> {

    }

}

export const inMemoryVectorStore =
    new InMemoryVectorStore();