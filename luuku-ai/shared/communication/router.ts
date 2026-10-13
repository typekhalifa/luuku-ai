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
    communicationExecutionService,
    CommunicationExecutionService,
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

    constructor(
        private readonly executionService: Pick<
            CommunicationExecutionService,
            "start" | "markExecuting" | "complete"
        > = communicationExecutionService,
    ) {}

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
            await this.executionService.start(
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

            await this.executionService.complete(
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

            await this.executionService.complete(
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

            await this.executionService.complete(
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

            await this.executionService.complete(
                execution.id,
                result
            );

            return result;
        }

        await this.executionService.markExecuting(
            execution.id
        );

        let result: CommunicationExecutionResult;

        try {
            result = await adapter.execute(request);
        } catch (error) {
            // An adapter/transport exception cannot prove that the provider did
            // not accept the action. Persist UNKNOWN when possible.
            result = {
                capability: request.capability,
                channel: request.channel,
                status: "unknown",
                executed: false,
                verified: false,
                summary:
                    "Communication adapter outcome is unknown; external execution may have occurred before the response was lost.",
                error:
                    error instanceof Error
                        ? error.message
                        : String(error),
            };

            try {
                await this.executionService.complete(execution.id, result);
            } catch {
                // The record remains executing. A subsequent attempt must fail
                // closed rather than dispatching the provider a second time.
            }

            return result;
        }

        try {
            await this.executionService.complete(execution.id, result);
            return result;
        } catch (error) {
            // The provider returned a result but local persistence failed. Do not
            // turn this into a retryable provider failure or call the adapter
            // again. The durable row remains executing and is reconciled later.
            return {
                capability: request.capability,
                channel: request.channel,
                status: "unknown",
                executed: false,
                verified: false,
                evidence: result.evidence,
                summary:
                    "Provider returned a result but local execution-ledger persistence failed; external outcome requires reconciliation and must not be resent automatically.",
                error:
                    error instanceof Error
                        ? error.message
                        : String(error),
            };
        }
    }
}

export const communicationRouter =
    new CommunicationRouter();
