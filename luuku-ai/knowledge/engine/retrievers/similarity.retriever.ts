import type { RetrievalResult } from "../types";

import type { Retriever } from "./retriever";

export class SimilarityRetriever
    implements Retriever {

    readonly name = "similarity";

    async retrieve(
        query: string,
        limit = 5
    ): Promise<RetrievalResult[]> {

        return [];

    }

}

export const similarityRetriever =
    new SimilarityRetriever();