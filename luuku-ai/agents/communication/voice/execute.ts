import {

    AgentTask,

    AgentResult

} from "../../../shared/agents/interface";

import {

    placeVoiceCall

} from "../../../shared/voice/call";

export async function executeVoiceTask(

    task: AgentTask

): Promise<AgentResult> {

    const result = await placeVoiceCall({

        contactName: "Unknown",

        company: "Unknown",

        phoneNumber: "",

        purpose: task.title,

        language: "English",

        tone: "professional"

    });

    return {

        success: result.success,

        summary: result.summary,

        completedAt: new Date().toISOString()

    };

}