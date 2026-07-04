import { BaseAgent } from "../../../shared/agents/base";

import {

    AgentTask,

    AgentResult

} from "../../../shared/agents/interface";

import {

    executeVoiceTask

} from "./execute";

export class VoiceAgent extends BaseAgent {

    id = "voice";

    name = "Voice Agent";

    role = "Voice";

    async execute(

        task: AgentTask

    ): Promise<AgentResult> {

        return executeVoiceTask(task);

    }

}