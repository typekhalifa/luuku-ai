import type {
    KnowledgeChunk,
    KnowledgeEmbedding,
} from "../types";

export interface EmbeddingProvider {

    readonly name: string;

    embed(
        chunks: KnowledgeChunk[]
    ): Promise<KnowledgeEmbedding[]>;

}