import type { KnowledgeDocument } from "../types";
import type { KnowledgeParser } from "./base.parser";

export class MarkdownParser implements KnowledgeParser {

    readonly name = "markdown";

    supports(document: KnowledgeDocument): boolean {

        return document.title.endsWith(".md");

    }

    async parse(
        document: KnowledgeDocument
    ): Promise<KnowledgeDocument> {

        return document;

    }

}

export const markdownParser =
    new MarkdownParser();