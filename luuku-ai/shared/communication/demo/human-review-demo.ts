import { AgentTask } from "../../agents/interface";
import { HumanReviewService } from "../human-review.service";

async function main(): Promise<void> {
    const service = new HumanReviewService();

    const task: AgentTask = {
        id: "human-review-demo-task",
        title: "Send high-value proposal",
        description: "Send a proposal to the prospect.",
        priority: "high",
    };

    const review = service.createReview({
        task,
        requestedBy: "sales-agent",
        action: "email.send",
        reason: "High-value external communication requires founder review.",
    });

    console.log("");
    console.log("========================================");
    console.log("       HUMAN REVIEW ESCALATION TEST");
    console.log("========================================");
    console.log("");
    console.log(`Review status before decision : ${review.status}`);
    console.log(`Can execute before approval   : ${service.canExecute(review.id)}`);

    if (service.canExecute(review.id)) {
        throw new Error("REVIEWED_ACTION_EXECUTED_BEFORE_APPROVAL");
    }

    const decision = service.decide(
        review.id,
        "founder",
        "approve",
        "Approved for external delivery.",
    );

    console.log(`Decision                       : ${decision.status}`);
    console.log(`Reviewer                       : ${decision.review.reviewerId}`);
    console.log(`Can execute after approval     : ${service.canExecute(review.id)}`);

    if (
        decision.status !== "approved" ||
        !service.canExecute(review.id) ||
        decision.review.status !== "approved"
    ) {
        throw new Error("HUMAN_REVIEW_APPROVAL_FLOW_FAILED");
    }

    const rejected = service.createReview({
        task: {
            ...task,
            id: "human-review-reject-demo-task",
        },
        requestedBy: "finance-agent",
        action: "payment.execute",
        reason: "Payment requires human approval.",
    });

    const rejection = service.decide(
        rejected.id,
        "founder",
        "reject",
        "Do not execute this payment.",
    );

    if (service.canExecute(rejected.id) || rejection.status !== "rejected") {
        throw new Error("HUMAN_REVIEW_REJECTION_FLOW_FAILED");
    }

    console.log(`Rejected action executable     : ${service.canExecute(rejected.id)}`);
    console.log("");
    console.log("GREEN: reviewed actions stay blocked until explicit approval, and rejected actions remain non-executable.");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
