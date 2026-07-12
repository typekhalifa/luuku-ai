export type CompanyStatus =
    | "prospect"
    | "qualified"
    | "customer"
    | "inactive";

export type CompanySize =
    | "startup"
    | "small"
    | "medium"
    | "enterprise";

export interface Company {

    id: string;

    name: string;

    industry: string;

    website?: string;

    country: string;

    city?: string;

    size?: CompanySize;

    status: CompanyStatus;

    confidence: number;

    verified: boolean;

    source: string;

    createdAt: string;

    updatedAt: string;

}