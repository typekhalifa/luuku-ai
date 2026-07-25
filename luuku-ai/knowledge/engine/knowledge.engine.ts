export class KnowledgeEngine {

    async ingest(): Promise<void> {

        throw new Error("Not implemented.");

    }

    async ask(
        query: string
    ): Promise<string> {

        throw new Error("Not implemented.");

    }

}

export const knowledgeEngine =
    new KnowledgeEngine();