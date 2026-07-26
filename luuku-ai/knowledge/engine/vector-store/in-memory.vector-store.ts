import type {

    StoredVector,

    RetrievalResult,

} from "../types";

import type { VectorStore } from "./vector-store";

export class InMemoryVectorStore
    implements VectorStore {

    readonly name = "in-memory";

    private readonly vectors =
        new Map<string, StoredVector>();

    async store(
        vectors: StoredVector[],
    ): Promise<void> {

        for (const vector of vectors) {

            this.vectors.set(

                vector.chunk.id,

                vector,

            );

        }

    }

    async all(): Promise<StoredVector[]> {

        return Array.from(

            this.vectors.values(),

        );

    }

    async search(
        queryEmbedding: number[],
        limit = 5,
    ): Promise<RetrievalResult[]> {

        void queryEmbedding;

        void limit;

        return [];

    }

    async delete(
        ids: string[],
    ): Promise<void> {

        for (const id of ids) {

            this.vectors.delete(id);

        }

    }

    async clear(): Promise<void> {

        this.vectors.clear();

    }

    count(): number {

        return this.vectors.size;

    }

}

export const inMemoryVectorStore =
    new InMemoryVectorStore();