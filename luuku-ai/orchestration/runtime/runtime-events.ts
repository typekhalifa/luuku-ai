export type RuntimeEventType = "workflow.step.completed" | "workflow.step.failed" | "workflow.step.retry.scheduled" | "workflow.step.blocked" | "workflow.step.reconciliation_required" | "workflow.step.escalated";

export interface RuntimeEvent {
    type: RuntimeEventType;
    workflowId: string;
    stepId: string;
    occurredAt: Date;
    metadata?: Record<string, unknown>;
}

export type RuntimeEventHandler = (event: RuntimeEvent) => Promise<void> | void;

/** Lightweight V6 event boundary. Durable workflow/queue state remains the source of truth. */
export class RuntimeEventBus {
    private readonly handlers = new Map<RuntimeEventType, RuntimeEventHandler[]>();

    on(type: RuntimeEventType, handler: RuntimeEventHandler): void {
        const handlers = this.handlers.get(type) ?? [];
        handlers.push(handler);
        this.handlers.set(type, handlers);
    }

    async publish(event: RuntimeEvent): Promise<void> {
        for (const handler of this.handlers.get(event.type) ?? []) await handler(event);
    }
}
