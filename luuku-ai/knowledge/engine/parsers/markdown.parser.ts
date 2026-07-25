import type { KnowledgeDocument } from "../types";
import type { KnowledgeParser } from "./base.parser";

export class MarkdownParser implements KnowledgeParser {

    readonly name = "markdown";

    supports(document: KnowledgeDocument): boolean {

        return document.title
            .toLowerCase()
            .endsWith(".md");

    }

    async parse(
        document: KnowledgeDocument,
    ): Promise<KnowledgeDocument> {

        const content = document.content

            .replace(/\r\n/g, "\n")
            .replace(/\t/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim();

        return {

            ...document,

            content,

        };

    }

}

export const markdownParser =
    new MarkdownParser();