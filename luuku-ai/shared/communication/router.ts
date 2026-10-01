import {
    CommunicationAdapter,
    CommunicationCapability,
    CommunicationExecutionResult,
    CommunicationRequest
} from "./types";

import {
    communicationPolicy
} from "./communication-policy";

import {
    communicationExecutionService
} from "./communication-execution.service";

import {
    humanReviewService
} from "./human-review.service";

import {
    AgentTask
} from "../agents/interface";

function metadataString(
    request: CommunicationRequest,
    key: string,
): string | undefined {
    const value = request.metadata?.[key];
    return typeof value === "string" && value.trim()
        ? value.trim()
        : undefined;
}

function reviewTask(
    request: CommunicationRequest,
): AgentTask {
    const taskId =
        metadataString(request, "taskId") ||
        `communication-review-${Date.now()}`;

    return {
        id: taskId,
        title:
            metadataString(request, "taskTitle") ||
            `Review ${request.capability}`,
        description:
            metadataString(request, "taskDescription") ||
            request.body ||
            `Review ${request.capability} communication.`,
        priority:
            metadataString(request, "taskPriority") === "low"
                ? "low"
                : metadataString(request, "taskPriority") === "high"
                    ? "high"
                    : "medium",
    };
}

export class CommunicationRouter {

    private readonly adapters =
        new Map<CommunicationCapability, CommunicationAdapter>();

    register(
        adapter: CommunicationAdapter
    ): void {
        this.adapters.set(
            adapter.capability,
            adapter
        );
    }

    hasCapability(
        capability: CommunicationCapability
    ): boolean {
        const adapter =
            this.adapters.get(capability);

        return Boolean(
            adapter?.isAvailable()
        );
    }

    listCapabilities(): CommunicationCapability[] {
        return Array.from(
            this.adapters.entries()
        )
            .filter(([, adapter]) =>
                adapter.isAvailable()
            )
            .map(([capability]) =>
                capability
            );
    }

    async execute(
        request: CommunicationRequest
    ): Promise<CommunicationExecutionResult> {
        const policy =
            await communicationPolicy.evaluate(request);

        const execution =
            await communicationExecutionService.start(
                request,
                policy
            );

        if (execution.existingResult) {
            return execution.existingResult;
        }

        const reviewId =
            metadataString(request, "reviewId");

        const approvedReview =
            policy.decision === "review" &&
            reviewId
                ? humanReviewService.canExecuteFor({
                      reviewId,
                      taskId: metadataString(request, "taskId"),
                      requestedBy: request.requesterAgentId || "system",
                      action: request.capability,
                  })
                : false;

        if (policy.decision === "review" && !approvedReview) {
            const review = reviewId
                ? humanReviewService.get(reviewId)
                : undefined;

            const reviewRequest =
                review ||
                humanReviewService.createReview({
                    task: reviewTask(request),
                    requestedBy: request.requesterAgentId || "system",
                    action: request.capability,
                    reason: policy.reason,
                });

            const result: CommunicationExecutionResult = {
                capability: request.capability,
                channel: request.channel,
                status: "blocked",
                executed: false,
                verified: false,
                summary:
                    reviewRequest.status === "rejected"
                        ? "Human review rejected this communication action."
                        : `Human review is required before this communication can execute. Review ID: ${reviewRequest.id}`,
                error:
                    reviewRequest.status === "rejected"
                        ? "COMMUNICATION_HUMAN_REVIEW_REJECTED"
                        : "COMMUNICATION_HUMAN_REVIEW_REQUIRED",
                reviewId: reviewRequest.id,
            };

            await communicationExecutionService.complete(
                execution.id,
                result
            );

            return result;
        }

        if (policy.decision !== "allow" && !approvedReview) {
            const result: CommunicationExecutionResult = {
                capability: request.capability,
                channel: request.channel,
                status: "blocked",
                executed: false,
                verified: false,
                summary: policy.reason,
                error: policy.errorCode,
            };

            await communicationExecutionService.complete(
                execution.id,
                result
            );

            return result;
        }

        const adapter =
            this.adapters.get(
                request.capability
            );

        if (!adapter) {
            const result: CommunicationExecutionResult = {
                capability: request.capability,
                channel: request.channel,
                status: "blocked",
                executed: false,
                verified: false,
                summary:
                    `Communication capability ${request.capability} is not registered.`,
                error:
                    "CAPABILITY_NOT_REGISTERED"
            };

            await communicationExecutionService.complete(
                execution.id,
                result
            );

            return result;
        }

        if (!adapter.isAvailable()) {
            const result: CommunicationExecutionResult = {
                capability: request.capability,
                channel: request.channel,
                status: "blocked",
                executed: false,
                verified: false,
                summary:
                    `Communication capability ${request.capability} is registered but currently unavailable.`,
                error:
                    "CAPABILITY_UNAVAILABLE"
            };

            await communicationExecutionService.complete(
                execution.id,
                result
            );

            return result;
        }

        await communicationExecutionService.markExecuting(
            execution.id
        );

        try {
            const result =
                await adapter.execute(request);

            await communicationExecutionService.complete(
                execution.id,
                result
            );

            return result;
        } catch (error) {
            const result: CommunicationExecutionResult = {
                capability: request.capability,
                channel: request.channel,
                status: "failed",
                executed: false,
                verified: false,
                summary:
                    "Communication adapter execution failed before completion.",
                error:
                    error instanceof Error
                        ? error.message
                        : String(error),
            };

            await communicationExecutionService.complete(
                execution.id,
                result
            );

            return result;
        }
    }
}

export const communicationRouter =
    new CommunicationRouter();
