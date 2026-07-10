export interface Company {

    id: string;

    name: string;

    industry: string;

    website?: string;

    country: string;

    city?: string;

    size?:
        | "startup"
        | "small"
        | "medium"
        | "enterprise";

    status:
        | "prospect"
        | "qualified"
        | "customer"
        | "inactive";

    confidence: number;

    verified: boolean;

    source: string;

    createdAt: string;

    updatedAt: string;

}