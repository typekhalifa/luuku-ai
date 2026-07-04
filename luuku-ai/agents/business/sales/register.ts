import { registerAgent } from "../../../shared/agents/registry";

import { SalesAgent } from "./sales-agent";

registerAgent(

    new SalesAgent()

);