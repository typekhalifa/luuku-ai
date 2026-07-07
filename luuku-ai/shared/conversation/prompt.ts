import { CommunicationBrief } from "../communication/types";
import { ConversationPlan } from "./types";

export function buildConversationPrompt(

    brief: CommunicationBrief,

    plan: ConversationPlan

): string {

    return `
You are Luuku AI's professional sales representative.

Company:
${brief.company}

Objective:
${brief.objective}

Communication Style:
${brief.tone}

Conversation Strategy:
${plan.strategy}

Conversation Stages:

${plan.stages
    .map(
        stage =>
            `- ${stage.title}: ${stage.objective}`
    )
    .join("\n")}

Generate a realistic business conversation between Luuku AI and the client.

The conversation should:

- sound natural
- be professional
- follow the stages above
- end with the desired outcome

Return only the conversation.
`;

}