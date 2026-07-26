export * from "./retriever";

export * from "./similarity.retriever";

import {
    SimilarityRetriever,
} from "./similarity.retriever";

import {
    openAIEmbeddingProvider,
} from "../embeddings";

import {
    inMemoryVectorStore,
} from "../vector-store";

import {
    cosineSimilarityMetric,
} from "../similarity";

export const similarityRetriever =
    new SimilarityRetriever(

        openAIEmbeddingProvider,

        inMemoryVectorStore,

        cosineSimilarityMetric,

    );