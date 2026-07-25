import type {
    KnowledgeChunk,
    KnowledgeDocument,
} from "../types";

export interface KnowledgeChunker {

    readonly name: string;

    chunk(
        document: KnowledgeDocument
    ): Promise<KnowledgeChunk[]>;

}