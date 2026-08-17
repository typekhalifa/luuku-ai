import {
    communicationPolicy,
    CommunicationPolicyResult,
} from "../communication-policy";

import {
    communicationRouter,
} from "../router";

import {
    CommunicationAdapter,
} from "../types";

async function main() {
    let adapterExecuted = false;

    const adapter: CommunicationAdapter = {
        capability: "email.send",
        channel: "email",

        isAvailable(): boolean {
            return true;
        },

        async execute() {
            adapterExecuted = true;

            return {
                capability: "email.send",
                channel: "email",
                status: "verified",
                executed: true,
                verified: true,
                summary: "TEST ADAPTER EXECUTED",
            };
        },
    };

    communicationRouter.register(adapter);

    const originalEvaluate =
        communicationPolicy.evaluate.bind(communicationPolicy);

    const reviewResult: CommunicationPolicyResult = {
        decision: "review",
        reason:
            "Recipient identity is ambiguous or requires review before external communication.",
        errorCode:
            "COMMUNICATION_IDENTITY_REVIEW_REQUIRED",
    };

    communicationPolicy.evaluate =
        async () => reviewResult;

    try {
        const result =
            await communicationRouter.execute({
                capability: "email.send",
                channel: "email",
                recipientExternalId: "review-required@example.com",
                subject: "Policy review regression test",
                body: "This must never reach the adapter.",
                metadata: {
                    audience: "external",
                    executionMode: "test",
                },
            });

        console.log("");
        console.log("========================================");
        console.log("   COMMUNICATION POLICY REVIEW TEST");
        console.log("========================================");
        console.log("");
        console.log("Policy decision :", reviewResult.decision);
        console.log("Router status   :", result.status);
        console.log("Executed        :", result.executed);
        console.log("Verified        :", result.verified);
        console.log("Error           :", result.error);
        console.log("Adapter called  :", adapterExecuted);
        console.log("");

        if (
            reviewResult.decision !== "review" ||
            result.status !== "blocked" ||
            result.executed ||
            result.verified ||
            adapterExecuted
        ) {
            throw new Error(
                "Communication policy review regression failed: the provider adapter was not safely blocked."
            );
        }

        console.log("GREEN: REVIEW prevented provider execution.");
    } finally {
        communicationPolicy.evaluate = originalEvaluate;
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
