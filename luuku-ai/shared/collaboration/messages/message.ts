import { MessagePriority } from "./message-priority";

import { MessageStatus } from "./message-status";

import { MessageType } from "./message-type";

export interface AgentMessage<T = unknown> {

    id: string;

    from: string;

    to: string;

    type: MessageType;

    subject: string;

    payload: T;

    priority: MessagePriority;

    status: MessageStatus;

    createdAt: string;

}