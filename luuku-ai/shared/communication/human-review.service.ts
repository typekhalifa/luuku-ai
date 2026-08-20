import { AgentTask } from "../agents/interface";

export type HumanReviewStatus =
    | "pending"
    | "approved"
    | "rejected"
    | "expired";

export interface HumanReviewRequest {
    id: string;
    taskId: string;
    requestedBy: string;
    reviewerId?: string;
    action: string;
    reason: string;
    status: HumanReviewStatus;
    createdAt: string;
    resolvedAt?: string;
    resolutionNote?: string;
}

export interface HumanReviewDecision {
    status: "approved" | "rejected";
    review: HumanReviewRequest;
}

/**
 * Small in-process approval boundary for actions that policy marks REVIEW.
 * It deliberately does not execute the underlying action.
 */
export class HumanReviewService {
    private readonly reviews = new Map<string, HumanReviewRequest>();

    createReview(input: {
        task: AgentTask;
        requestedBy: string;
        action: string;
        reason: string;
    }): HumanReviewRequest {
        const review: HumanReviewRequest = {
            id: `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            taskId: input.task.id,
            requestedBy: input.requestedBy,
            action: input.action,
            reason: input.reason,
            status: "pending",
            createdAt: new Date().toISOString(),
        };

        this.reviews.set(review.id, review);
        return { ...review };
    }

    get(reviewId: string): HumanReviewRequest | undefined {
        const review = this.reviews.get(reviewId);
        return review ? { ...review } : undefined;
    }

    decide(
        reviewId: string,
        reviewerId: string,
        decision: "approve" | "reject",
        resolutionNote?: string,
    ): HumanReviewDecision {
        const review = this.reviews.get(reviewId);

        if (!review) {
            throw new Error("HUMAN_REVIEW_NOT_FOUND");
        }

        if (review.status !== "pending") {
            throw new Error("HUMAN_REVIEW_ALREADY_RESOLVED");
        }

        review.status = decision === "approve" ? "approved" : "rejected";
        review.reviewerId = reviewerId;
        review.resolvedAt = new Date().toISOString();
        review.resolutionNote = resolutionNote;

        return {
            status: review.status,
            review: { ...review },
        };
    }

    canExecute(reviewId: string): boolean {
        return this.reviews.get(reviewId)?.status === "approved";
    }
}

export const humanReviewService = new HumanReviewService();
