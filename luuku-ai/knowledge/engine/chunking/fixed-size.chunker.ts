import type {
    KnowledgeChunk,
    KnowledgeDocument,
} from "../types";

import type {
    KnowledgeChunker,
} from "./base.chunker";

export class FixedSizeChunker
    implements KnowledgeChunker {

    readonly name = "fixed-size";

    private readonly chunkSize = 800;

    async chunk(
        document: KnowledgeDocument,
    ): Promise<KnowledgeChunk[]> {

        const chunks: KnowledgeChunk[] = [];

        const content = document.content;

        let index = 0;

        for (

            let start = 0;

            start < content.length;

            start += this.chunkSize

        ) {

            const end = start + this.chunkSize;

            const chunkContent = content.slice(
                start,
                end,
            );

            chunks.push({

                id: `${document.id}:chunk:${index}`,

                documentId: document.id,

                index,

                content: chunkContent,

                tokens: 0,

                metadata: {

                    source: document.source,

                    start,

                    end: Math.min(
                        end,
                        content.length,
                    ),

                },

            });

            index++;

        }

        return chunks;

    }

}

export const fixedSizeChunker =
    new FixedSizeChunker();