import { KnowledgeEngine } from "./knowledge.engine";
import { KnowledgeService } from "./services";

import { knowledgeAssetLoader } from "./loaders";
import { markdownParser } from "./parsers";
import { fixedSizeChunker } from "./chunking";
import { openAIEmbeddingProvider } from "./embeddings";
import { inMemoryVectorStore } from "./vector-store";
import { similarityRetriever } from "./retrievers";
import { defaultContextBuilder } from "./context";

export const knowledgeService =
    new KnowledgeService(

        knowledgeAssetLoader,

        markdownParser,

        fixedSizeChunker,

        openAIEmbeddingProvider,

        inMemoryVectorStore,

        similarityRetriever,

        defaultContextBuilder,

    );

export const knowledgeEngine =
    new KnowledgeEngine(

        knowledgeService,

    );