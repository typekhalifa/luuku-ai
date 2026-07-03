import { ExecutiveDecision } from "./decision";
import { registry } from "./registry";

export function delegateDecision(

    decision: ExecutiveDecision

) {

    const agent = registry.find(

        agent =>

            agent.name === decision.assignedAgent ||

            agent.role === decision.assignedAgent

    );

    if (!agent) {

        throw new Error(

            `Unknown agent "${decision.assignedAgent}".`

        );

    }

    console.log("");

    console.log("========================================");

    console.log("      EXECUTIVE DELEGATION");

    console.log("========================================");

    console.log("");

    console.log(`Agent      : ${agent.name}`);

    console.log(`Role       : ${agent.role}`);

    console.log(`Action     : ${decision.recommendedAction}`);

    console.log(`Confidence : ${(decision.confidence * 100).toFixed(1)}%`);

    console.log("");

    console.log("Delegation completed.");

}