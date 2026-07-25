export type KnowledgeSource =
    | "industry"
    | "offer"
    | "playbook"
    | "prompt"
    | "prospect"
    | "template"
    | "website"
    | "github"
    | "notion"
    | "api"
    | "database"
    | "manual"
    | "unknown";

export interface KnowledgeDocument {

    id: string;

    title: string;

    source: KnowledgeSource;

    content: string;

    metadata: Record<string, unknown>;

    createdAt: Date;

    updatedAt: Date;

}