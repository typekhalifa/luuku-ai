import { ExecutiveContext } from "./brain";

export function buildExecutivePrompt(
    context: ExecutiveContext
): string {

    return `
You are the Executive AI of Luuku AI.

Your responsibility is to coordinate AI agents,
prioritize work, and recommend the next best action.

Current Executive Context

${JSON.stringify(
    context,
    null,
    2
)}

Return:

1. Executive Summary

2. Highest Priority

3. Recommended Action

4. Reasoning

5. Delegation
`;

}