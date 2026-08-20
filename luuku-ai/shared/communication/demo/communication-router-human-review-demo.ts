import {
    communicationPolicy,
} from "../communication-policy";

import {
    communicationRouter,
} from "../router";

import {
    humanReviewService,
} from "../human-review.service";

import {
    CommunicationAdapter,
    CommunicationPolicyResult,
} from "../types";

const reviewPolicy: CommunicationPolicyResult = {
    decision: "review",
    reason: "This demo action requires explicit human approval.",
    errorCode: "COMMUNICATION_IDENTITY_REVIEW_REQUIRED",
};

const demoAdapter: CommunicationAdapter = {
    capability: "email.send",
    channel: "email",
    isAvailable: () => true,
    async execute(request) {
        return {
            capability: request.capability,
            channel: request.channel,
            status: "verified",
            executed: true,
            verified: true,
            evidence: {
                provider: "human-review-demo",
                externalId: `demo/${Date.now()}`,
            },
            summary: "Demo adapter executed after human approval.",
        };
    },
};

async function main(): Promise<void> {
    communicationRouter.register(demoAdapter);

    const originalEvaluate = communicationPolicy.evaluate.bind(communicationPolicy);
    communicationPolicy.evaluate = async () => reviewPolicy;

    try {
        const taskId = `router-review-${Date.now()}`;
        const baseRequest = {
            capability: "email.send" as const,
            channel: "email" as const,
            recipient: "demo@example.com",
            requesterAgentId: "sales",
            target: "external" as const,
            subject: "Approval test",
            body: "This must not execute before approval.",
            metadata: {
                audience: "external",
                taskId,
                taskTitle: "Approval gate demo",
                taskDescription: "Verify router review enforcement.",
                taskPriority: "high",
                idempotencyKey: `${taskId}/first`,
            },
        };

        console.log("");
        console.log("========================================");
        console.log("   COMMUNICATION ROUTER REVIEW TEST");
        console.log("========================================");
        console.log("");

        const first = await communicationRouter.execute(baseRequest);

        console.log(`First status       : ${first.status}`);
        console.log(`First executed     : ${first.executed}`);
        console.log(`Review ID          : ${first.reviewId}`);

        if (
            first.status !== "blocked" ||
            first.executed ||
            !first.reviewId ||
            humanReviewService.canExecute(first.reviewId)
        ) {
            throw new Error("ROUTER_REVIEW_DID_NOT_BLOCK_BEFORE_APPROVAL");
        }

        const decision = humanReviewService.decide(
            first.reviewId,
            "founder",
            "approve",
            "Approved for demo execution.",
        );

        const second = await communicationRouter.execute({
            ...baseRequest,
            body: "This may execute after approval.",
            metadata: {
                ...baseRequest.metadata,
                reviewId: first.reviewId,
                idempotencyKey: `${taskId}/approved`,
            },
        });

        console.log(`Decision           : ${decision.status}`);
        console.log(`Second status      : ${second.status}`);
        console.log(`Second executed    : ${second.executed}`);
        console.log(`Second verified    : ${second.verified}`);

        if (
            decision.status !== "approved" ||
            second.status !== "verified" ||
            !second.executed ||
            !second.verified
        ) {
            throw new Error("ROUTER_REVIEW_APPROVAL_DID_NOT_ENABLE_EXECUTION");
        }

        console.log("");
        console.log("GREEN: Communication Router creates a review gate, blocks execution, and only proceeds after explicit approval.");
    } finally {
        communicationPolicy.evaluate = originalEvaluate;
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
