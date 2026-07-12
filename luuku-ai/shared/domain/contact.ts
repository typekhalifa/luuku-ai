export interface Contact {

    id: string;

    companyId: string;

    name: string;

    email?: string;

    phoneNumber?: string;

    preferredLanguage?: string;

    department?: string;

    position?: string;

    verified: boolean;

    confidence: number;

    source: string;

    lastVerifiedAt?: string;

    createdAt: string;

    updatedAt: string;

}