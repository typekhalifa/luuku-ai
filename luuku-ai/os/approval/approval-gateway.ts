export type ApprovalDecision = "AUTO" | "REQUIRES_APPROVAL";

export interface ApprovalRequest {
    id: string;
    action: string;
    reason: string;
    requestedBy: string;
    createdAt: Date;
}

export interface ApprovalResolution {
    decision: ApprovalDecision;
    request?: ApprovalRequest;
}

export interface ApprovalPolicy {
    requiresApproval(action: string): boolean;
}

export class FounderApprovalGateway {
    constructor(private readonly policy: ApprovalPolicy) {}

    evaluate(input: {
        id: string;
        action: string;
        requestedBy: string;
        reason?: string;
    }): ApprovalResolution {
        if (!this.policy.requiresApproval(input.action)) {
            return { decision: "AUTO" };
        }

        return {
            decision: "REQUIRES_APPROVAL",
            request: {
                id: input.id,
                action: input.action,
                reason: input.reason ?? "Founder approval is required for this action.",
                requestedBy: input.requestedBy,
                createdAt: new Date(),
            },
        };
    }
}
