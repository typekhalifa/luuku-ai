import {
    CommunicationAdapter,
    CommunicationExecutionResult,
    CommunicationRequest
} from "./types";

import { ExecutionEvidence } from "../execution/types";

function isValidDate(value?: string): boolean {
    if (!value) {
        return false;
    }

    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime());
}

function createSimulationId(): string {
    return `calendar-sim-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export class SimulationCalendarAdapter implements CommunicationAdapter {

    readonly capability = "calendar.schedule" as const;
    readonly channel = "calendar" as const;

    isAvailable(): boolean {
        const mode =
            process.env.CALENDAR_MODE || "simulation";

        return mode === "simulation";
    }

    async execute(
        request: CommunicationRequest
    ): Promise<CommunicationExecutionResult> {

        if (!request.startAt || !request.endAt) {
            return {
                capability: this.capability,
                channel: this.channel,
                status: "blocked",
                executed: false,
                verified: false,
                summary:
                    "Calendar scheduling requires both startAt and endAt.",
                error: "CALENDAR_TIME_RANGE_REQUIRED"
            };
        }

        if (!isValidDate(request.startAt) || !isValidDate(request.endAt)) {
            return {
                capability: this.capability,
                channel: this.channel,
                status: "blocked",
                executed: false,
                verified: false,
                summary:
                    "Calendar scheduling received an invalid date or time.",
                error: "CALENDAR_INVALID_TIME_RANGE"
            };
        }

        const start = new Date(request.startAt);
        const end = new Date(request.endAt);

        if (end.getTime() <= start.getTime()) {
            return {
                capability: this.capability,
                channel: this.channel,
                status: "blocked",
                executed: false,
                verified: false,
                summary:
                    "Calendar scheduling requires endAt to be after startAt.",
                error: "CALENDAR_INVALID_TIME_ORDER"
            };
        }

        const externalId = createSimulationId();

        const evidence: ExecutionEvidence = {
            provider: "luuku-calendar-simulation",
            externalId,
            details: {
                recipient: request.recipient,
                recipientExternalId: request.recipientExternalId,
                subject: request.subject || "Luuku AI meeting",
                startAt: start.toISOString(),
                endAt: end.toISOString(),
                mode: "simulation",
                providerAccepted: true
            }
        };

        return {
            capability: this.capability,
            channel: this.channel,
            status: "simulated",
            executed: false,
            verified: false,
            evidence,
            summary:
                `Calendar event simulated from ${start.toISOString()} to ${end.toISOString()}.`
        };
    }
}

export const calendarAdapter =
    new SimulationCalendarAdapter();
