import { registerAgent } from "../../../shared/agents/registry";

import { VoiceAgent } from "./voice-agent";

registerAgent(

    new VoiceAgent()

);