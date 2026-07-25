import type { RetrievalResult } from "../types";

export interface Retriever {

    readonly name: string;

    retrieve(
        query: string,
        limit?: number
    ): Promise<RetrievalResult[]>;

}