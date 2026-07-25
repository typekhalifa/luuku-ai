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

        if (documents.length > 0) {

            console.table(

                parsed.map(document => ({

                    title: document.title,

                    source: document.source,

                    length: document.content.length,

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