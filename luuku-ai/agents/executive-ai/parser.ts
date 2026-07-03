import { ExecutiveDecision } from "./decision";

export function parseDecision(
    text: string
): ExecutiveDecision {

    try {

        return JSON.parse(text) as ExecutiveDecision;

    } catch {

        throw new Error(
            "Failed to parse Executive AI response."
        );

    }

}