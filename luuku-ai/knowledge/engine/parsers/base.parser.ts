import type { KnowledgeDocument } from "../types";

export interface KnowledgeParser {

    readonly name: string;

    supports(document: KnowledgeDocument): boolean;

    parse(document: KnowledgeDocument): Promise<KnowledgeDocument>;

}