export interface Contact {

    id: string;

    name: string;

    company: string;

    phoneNumber?: string;

    email?: string;

    preferredLanguage: string;

    department?: string;

    position?: string;

    verified: boolean;

    confidence: number;

    source: string;

    lastVerifiedAt?: string;

}