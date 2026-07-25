export interface KnowledgeChunk {

    id: string;

    documentId: string;

    index: number;

    content: string;

    tokens: number;

    metadata: Record<string, unknown>;

}