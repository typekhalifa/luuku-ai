import { requestAI } from "./client";

import { CommunicationBrief } from "../communication/types";

import { ConversationPlan } from "../conversation/types";

import { buildConversationPrompt } from "../conversation/prompt";

export async function requestConversation(

    brief: CommunicationBrief,

    plan: ConversationPlan

): Promise<string> {

    const prompt =

        buildConversationPrompt(

            brief,

            plan

        );

   return requestAI({

      prompt,

      temperature: 0.7

  });
}