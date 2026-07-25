import type {
    KnowledgeDocument,
    KnowledgeChunk,
    KnowledgeEmbedding,
    RetrievalResult,
} from "../types";

import { knowledgeAssetLoader } from "../loaders";
import { markdownParser } from "../parsers";
import { fixedSizeChunker } from "../chunking";
import { openAIEmbeddingProvider }
    from "../embeddings";

import { inMemoryVectorStore }
    from "../vector-store";    

import { similarityRetriever }
    from "../retrievers";

import {
    defaultContextBuilder,
} from "../context";    
export class KnowledgeService {

    async load(): Promise<KnowledgeDocument[]> {

        return knowledgeAssetLoader.load();

    }

    async parse(
        documents: KnowledgeDocument[]
    ): Promise<KnowledgeDocument[]> {

        return Promise.all(

            documents.map(async (document) => {

                if (markdownParser.supports(document)) {

                    return markdownParser.parse(document);

                }

                return document;

            })

        );

    }

    async chunk(
        documents: KnowledgeDocument[]
    ): Promise<KnowledgeChunk[]> {

        const chunks: KnowledgeChunk[] = [];

        for (const document of documents) {

            const result =
                await fixedSizeChunker.chunk(document);

            chunks.push(...result);

        }

        return chunks;

    }

    async embed(
        chunks: KnowledgeChunk[]
    ): Promise<KnowledgeEmbedding[]> {

        return openAIEmbeddingProvider.embed(chunks);

    }

    async store(
        embeddings: KnowledgeEmbedding[]
    ): Promise<void> {

        return inMemoryVectorStore.store(
            embeddings
        );

    }

    async retrieve(
        query: string
    ): Promise<RetrievalResult[]> {

        return similarityRetriever.retrieve(query);

    }

    async buildContext(
        query: string
    ): Promise<string> {

        const results =
            await this.retrieve(query);

        return defaultContextBuilder.build(
            results
        );

    }
}

export const knowledgeService =
    new KnowledgeService();