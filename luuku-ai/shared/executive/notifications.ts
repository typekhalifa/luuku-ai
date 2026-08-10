import { ExecutiveDecision } from "../../agents/executive-ai/decision";

export interface FounderNotification {
    level: "info" | "warning" | "critical";
    title: string;
    message: string;
}

export function buildFounderNotifications(
    decision: ExecutiveDecision,
): FounderNotification[] {
    const notifications: FounderNotification[] = [
        {
            level: decision.priority === "high" ? "warning" : "info",
            title: "Executive Decision",
            message: `${decision.summary}\n\nNext task: ${decision.task.title}\nPriority: ${decision.priority}\nConfidence: ${Math.round(decision.confidence * 100)}%`,
        },
    ];

    if (decision.confidence < 0.7) {
        notifications.push({
            level: "warning",
            title: "Low Confidence Decision",
            message: "Executive AI recommends human review before relying on this decision.",
        });
    }

    return notifications;
}
