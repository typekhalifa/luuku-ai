import type { KnowledgeDocument } from "../types";

export interface KnowledgeLoader {

    readonly name: string;

    load(): Promise<KnowledgeDocument[]>;

}