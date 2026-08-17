import {
    CommunicationChannel
} from "./channel";

import {
    ExecutionEvidence,
    ExecutionStatus
} from "../execution/types";

export interface CommunicationBrief {

    contactName: string;

    company: string;

    objective: string;

    tone:
        | "professional"
        | "friendly"
        | "formal";

    keyTalkingPoints: string[];

    desiredOutcome: string;

}

export type CommunicationCapability =
    | "email.send"
    | "calendar.schedule"
    | "voice.call"
    | "whatsapp.send"
    | "telegram.send"
    | "discord.send"
    | "slack.send";

export interface CommunicationRequest {

    capability: CommunicationCapability;

    channel: CommunicationChannel;

    recipient?: string;

    recipientExternalId?: string;

    requesterAgentId?: string;

    targetAgentId?: string;

    subject?: string;

    body?: string;

    startAt?: string;

    endAt?: string;

    metadata?: Record<string, unknown>;

}

export interface CommunicationExecutionResult {

    capability: CommunicationCapability;

    channel: CommunicationChannel;

    status: ExecutionStatus;

    executed: boolean;

    verified: boolean;

    evidence?: ExecutionEvidence;

    summary: string;

    error?: string;

}

export interface CommunicationAdapter {

    capability: CommunicationCapability;

    channel: CommunicationChannel;

    isAvailable(): boolean;

    execute(
        request: CommunicationRequest
    ): Promise<CommunicationExecutionResult>;

}
