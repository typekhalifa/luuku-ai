import type {
    ChatProvider,
} from "./llm";

import type {
    KnowledgeService,
} from "./services";

export class KnowledgeEngine {

    constructor(

        private readonly service: KnowledgeService,

        private readonly chat: ChatProvider,

    ) {}

    async ingest(): Promise<void> {

        console.log(
            "📂 Loading knowledge assets...",
        );

        const documents =
            await this.service.load();

        console.log(
            `📄 ${documents.length} documents loaded.`,
        );

        const parsed =
            await this.service.parse(
                documents,
            );

        const chunks =
            await this.service.chunk(
                parsed,
            );

        console.log("");

        console.log(
            `🧩 ${chunks.length} chunks created.`,
        );

        console.table(

            chunks.map(chunk => ({

                id: chunk.id,

                document: chunk.documentId,

                length: chunk.content.length,

            })),

        );

        const embeddings =
            await this.service.embed(
                chunks,
            );

        console.log("");

        console.log(
            `🧠 ${embeddings.length} embeddings created.`,
        );

        console.table(

            embeddings.map(embedding => ({

                chunk: embedding.chunkId,

                model: embedding.model,

                dimensions: embedding.dimensions,

            })),

        );

        await this.service.store(

            chunks,

            embeddings,

        );

        console.log("");

        console.log(
            `📦 Vector store size: ${this.service.countEmbeddings()}`,
        );

        console.log("");

        console.log(
            `💾 ${embeddings.length} embeddings stored.`,
        );

        console.log("");

        console.log(
            "✅ Knowledge ingestion completed.",
        );

        console.log("");

    }

    async ask(
        question: string,
    ): Promise<string> {

        const context =
            await this.service.buildContext(
                question,
            );

        return this.chat.answer({

            question,

            context,

        });

    }

}