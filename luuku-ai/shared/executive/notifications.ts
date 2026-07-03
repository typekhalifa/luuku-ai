import { ExecutiveDecision } from "../../agents/executive-ai/decision";

export interface FounderNotification {

    level:
        | "info"
        | "warning"
        | "critical";

    title: string;

    message: string;

}

export function buildFounderNotifications(

    decision: ExecutiveDecision

): FounderNotification[] {

    const notifications: FounderNotification[] = [];

    if (decision.priority === "high") {

        notifications.push({

            level: "warning",

            title: "High Priority Executive Decision",

            message: decision.summary

        });

    }

    if (decision.confidence < 0.70) {

        notifications.push({

            level: "warning",

            title: "Low Confidence Decision",

            message:
                "Executive AI recommends human review."

        });

    }

    return notifications;

}