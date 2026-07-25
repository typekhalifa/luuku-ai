import type {
    KnowledgeChunk,
    KnowledgeDocument,
} from "../types";

import type { KnowledgeChunker } from "./base.chunker";

export class FixedSizeChunker
    implements KnowledgeChunker {

    readonly name = "fixed-size";

    async chunk(
        document: KnowledgeDocument
    ): Promise<KnowledgeChunk[]> {

        return [];

    }

}

export const fixedSizeChunker =
    new FixedSizeChunker();