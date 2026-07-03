import { registerAgent }

from "../../shared/agents/registry";

import {

    ResearchAgent

} from "./research-agent";

registerAgent(

    new ResearchAgent()

);