import { prisma } from "../../database/client";
import { communicationRouter } from "../router";
import {
    CommunicationAdapter,
    CommunicationExecutionResult,
    CommunicationRequest,
} from "../types";

const idempotencyKey =
    `ledger-demo/${Date.now()}`;

const demoAdapter: CommunicationAdapter = {
    capability: "email.send",
    channel: "internal",

    isAvailable(): boolean {
        return true;
    },

    async execute(
        request: CommunicationRequest,
    ): Promise<CommunicationExecutionResult> {
        return {
            capability: request.capability,
            channel: request.channel,
            status: "verified",
            executed: true,
            verified: true,
            evidence: {
                provider: "communication-ledger-demo",
                externalId: idempotencyKey,
                details: {
                    demo: true,
                },
            },
            summary:
                "Communication execution ledger demo adapter completed successfully.",
        };
    },
};

async function main(): Promise<void> {
    communicationRouter.register(demoAdapter);

    const result =
        await communicationRouter.execute({
            capability: "email.send",
            channel: "internal",
            recipient: "ledger-demo",
            body: "Execution ledger regression test.",
            metadata: {
                audience: "internal",
                executionMode: "test",
                idempotencyKey,
                taskId: "communication-ledger-demo",
            },
        });

    const execution =
        await prisma.communicationExecution.findUnique({
            where: { idempotencyKey },
        });

    console.log("");
    console.log("========================================");
    console.log("   COMMUNICATION EXECUTION LEDGER TEST");
    console.log("========================================");
    console.log("");
    console.log(`Router status : ${result.status}`);
    console.log(`Executed      : ${result.executed}`);
    console.log(`Verified      : ${result.verified}`);
    console.log(`Ledger ID     : ${execution?.id ?? "missing"}`);
    console.log(`Ledger status : ${execution?.status ?? "missing"}`);
    console.log(`Provider      : ${execution?.provider ?? "missing"}`);
    console.log(`External ID   : ${execution?.externalId ?? "missing"}`);
    console.log("");

    if (
        result.status !== "verified" ||
        !result.executed ||
        !result.verified ||
        !execution ||
        execution.status !== "verified" ||
        execution.executed !== true ||
        execution.verified !== true ||
        execution.provider !== "communication-ledger-demo"
    ) {
        throw new Error(
            "Communication execution ledger regression failed.",
        );
    }

    console.log(
        "GREEN: provider result was persisted to CommunicationExecution.",
    );
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
