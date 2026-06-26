import { validateBusiness } from "../providers/web";

export function runPublicValidation(
    business: string
) {
    return validateBusiness(business);
}