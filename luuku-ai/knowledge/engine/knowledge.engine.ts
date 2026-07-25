import type { KnowledgeService } from "./services";

export class KnowledgeEngine {

    constructor(

        private readonly service: KnowledgeService,

    ) {}

    async ingest(): Promise<void> {

        const documents =
            await this.service.load();

        const parsed =
            await this.service.parse(documents);

        const chunks =
            await this.service.chunk(parsed);

        const embeddings =
            await this.service.embed(chunks);

        await this.service.store(embeddings);

    }

    async ask(
        query: string,
    ): Promise<string> {

        return this.service.buildContext(query);

    }

}