import { DomainEvent } from "../models/domain-event";

export type EventHandler = (
    event: DomainEvent
) => Promise<void>;