import type { KnowledgeService } from "./services";

export class KnowledgeEngine {

    constructor(

        private readonly service: KnowledgeService,

    ) {}

    async ingest(): Promise<void> {

        console.log("📂 Loading knowledge assets...");

        const documents =
            await this.service.load();

        console.log(
            `📄 ${documents.length} documents loaded.`,
        );

        const parsed = await this.service.parse(
            documents,
        );

        const chunks =
        await this.service.chunk(
            parsed,
        );

        if (documents.length > 0) {

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

        }

        console.log("");

    }
    async ask(
        query: string,
    ): Promise<string> {

        return this.service.buildContext(query);

    }

}