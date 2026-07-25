import type {
    KnowledgeEmbedding,
    RetrievalResult,
} from "../types";

export interface VectorStore {

    readonly name: string;

    store(
        embeddings: KnowledgeEmbedding[]
    ): Promise<void>;

    search(
        queryEmbedding: number[],
        limit?: number
    ): Promise<RetrievalResult[]>;

    delete(
        ids: string[]
    ): Promise<void>;

    clear(): Promise<void>;

}