import type {
    KnowledgeDocument,
    KnowledgeChunk,
    KnowledgeEmbedding,
    RetrievalResult,
} from "../types";

import type { KnowledgeLoader } from "../loaders";
import type { KnowledgeParser } from "../parsers";
import type { KnowledgeChunker } from "../chunking";
import type { EmbeddingProvider } from "../embeddings";
import type { VectorStore } from "../vector-store";
import type { Retriever } from "../retrievers";
import type { ContextBuilder } from "../context";

export class KnowledgeService {

    constructor(

        private readonly loader: KnowledgeLoader,

        private readonly parser: KnowledgeParser,

        private readonly chunker: KnowledgeChunker,

        private readonly embeddingProvider: EmbeddingProvider,

        private readonly vectorStore: VectorStore,

        private readonly retriever: Retriever,

        private readonly contextBuilder: ContextBuilder,

    ) {}

    async load(): Promise<KnowledgeDocument[]> {

        return this.loader.load();

    }

    async parse(
        documents: KnowledgeDocument[],
    ): Promise<KnowledgeDocument[]> {

        const parsed: KnowledgeDocument[] = [];

        for (const document of documents) {

            if (!this.parser.supports(document)) {

                parsed.push(document);

                continue;

            }

            parsed.push(
                await this.parser.parse(document),
            );

        }

        return parsed;

    }

    async chunk(
        documents: KnowledgeDocument[],
    ): Promise<KnowledgeChunk[]> {

        const chunks: KnowledgeChunk[] = [];

        for (const document of documents) {

            if (!document.content.trim()) {

                console.warn(
                    `⚠️ Skipping empty document: ${document.title}`,
                );

                continue;

            }

            const documentChunks =
                await this.chunker.chunk(document);

            chunks.push(...documentChunks);

        }

        return chunks;

    }

    async embed(
        chunks: KnowledgeChunk[],
    ): Promise<KnowledgeEmbedding[]> {

        return this.embeddingProvider.embed(
            chunks,
        );

    }

    async store(
        embeddings: KnowledgeEmbedding[],
    ): Promise<void> {

        await this.vectorStore.store(
            embeddings,
        );

    }

    async retrieve(
        query: string,
    ): Promise<RetrievalResult[]> {

        return this.retriever.retrieve(
            query,
        );

    }

    async buildContext(
        query: string,
    ): Promise<string> {

        const results =
            await this.retrieve(
                query,
            );

        return this.contextBuilder.build(
            results,
        );

    }

}