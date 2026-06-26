import { PublicValidation } from "../types/research";

export function validateBusiness(
    business: string
): PublicValidation {

    return {

        website: "",

        summary:
            "Public validation provider has not been connected yet.",

        validationSignals: [],

        evidence: [],

        confidenceBoost: 0

    };

}