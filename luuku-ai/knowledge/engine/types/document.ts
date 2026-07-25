export type KnowledgeSource =

    | "industry"
    | "offer"
    | "playbook"
    | "prompt"
    | "prospect"
    | "template"
    | "document"
    | "website"
    | "api"
    | "github"
    | "notion";

export interface KnowledgeDocument {

    id: string;

    title: string;

    source: KnowledgeSource;

    content: string;

    metadata: Record<string, unknown>;

    createdAt: Date;

    updatedAt: Date;

}