import type { ExecutiveState } from "./executive-state.js";

export interface ExecutiveBrief {
    title: string;
    summary: string;
    attention: readonly string[];
    generatedAt: Date;
}

export function buildExecutiveBrief(state: ExecutiveState): ExecutiveBrief {
    const total = state.active + state.waitingApproval + state.failed + state.completed;
    const summary = [
        `${total} tracked work items.`,
        `${state.active} active, ${state.completed} completed, ${state.failed} failed, ${state.waitingApproval} waiting for approval.`,
    ].join(" ");

    return {
        title: "Luuku Executive — Morning Brief",
        summary,
        attention: [...state.attention],
        generatedAt: state.generatedAt,
    };
}
