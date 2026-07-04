import "../../agents/register";

import { getAgents } from "../agents/registry";

export async function bootstrap() {

    const agents = getAgents();

    console.log("");

    console.log("==============================================");
    console.log("          LUUKU AI BOOTSTRAP");
    console.log("==============================================");

    console.log("");

    console.log("Loading Agent Registry...");

    console.log("");

    for (const agent of agents) {

        console.log(`✓ ${agent.name}`);

    }

    console.log("");

    console.log(`Registered Agents : ${agents.length}`);

    console.log("");

    console.log("Loading Executive Services...");

    console.log("");

    console.log("✓ Intelligence");
    console.log("✓ Memory");
    console.log("✓ Health");
    console.log("✓ Objectives");
    console.log("✓ Scheduler");
    console.log("✓ Notifications");

    console.log("");

    console.log("Loading AI Provider...");

    console.log("");

    console.log("✓ OpenAI");

    console.log("");

    console.log("System Status...");

    console.log("");

    console.log("✓ Ready");

    console.log("");

    console.log("==============================================");
    console.log("            LUUKU AI READY");
    console.log("==============================================");

    console.log("");

}