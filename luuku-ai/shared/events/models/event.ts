import type { ExecutionOwnership } from "../../../orchestration/ownership.js";

export interface Event {
    id: string;
    type: string;
    category: string;
    source: string;
    timestamp: string;
    ownership?: ExecutionOwnership;
}
