import type { KnowledgeChunk } from "./chunk";
import type { KnowledgeEmbedding } from "./embedding";

export interface StoredVector {

    chunk: KnowledgeChunk;

    embedding: KnowledgeEmbedding;

}