import type {

    StoredVector,

    RetrievalResult,

} from "../types";

export interface VectorStore {

    readonly name: string;

    store(
        vectors: StoredVector[],
    ): Promise<void>;

    all(): Promise<StoredVector[]>;

    search(
        queryEmbedding: number[],
        limit?: number,
    ): Promise<RetrievalResult[]>;

    delete(
        ids: string[],
    ): Promise<void>;

    clear(): Promise<void>;

    count(): number;

}