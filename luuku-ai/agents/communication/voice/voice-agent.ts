import { BaseAgent } from "../../../shared/agents/base";

import {

    AgentTask,

    AgentResult

} from "../../../shared/agents/interface";

export class VoiceAgent extends BaseAgent {

    id = "voice";

    name = "Voice Agent";

    role = "Voice";

    async execute(

        task: AgentTask

    ): Promise<AgentResult> {

        throw new Error(

            "VoiceAgent cannot execute directly. Voice calls must be executed through Sales Workflow after CRM contact resolution."

        );

    }

}