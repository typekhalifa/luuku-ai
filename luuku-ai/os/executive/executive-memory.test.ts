import { describe, expect, it } from "vitest";
import { ExecutiveLearningEngine, InMemoryExecutiveMemoryStore } from "./executive-memory.js";

const record = (id: string, action: string, success: boolean) => ({
    id,
    eventType: success ? "ACTION_COMPLETED" as const : "ACTION_FAILED" as const,
    action,
    outcome: success ? "ok" : "failed",
    success,
    createdAt: new Date("2026-09-05T10:00:00.000Z"),
});

describe("ExecutiveLearningEngine", () => {
    it("classifies successful actions", async () => {
        const store = new InMemoryExecutiveMemoryStore();
        await store.save(record("success-1", "research", true));
        const result = await new ExecutiveLearningEngine(store).learn();
        expect(result[0]).toMatchObject({ pattern: "SUCCESS_PATTERN", occurrences: 1, successfulOccurrences: 1 });
    });

    it("detects repeated failures", async () => {
        const store = new InMemoryExecutiveMemoryStore();
        await store.save(record("failure-1", "sync", false));
        await store.save(record("failure-2", "sync", false));
        const result = await new ExecutiveLearningEngine(store).learn();
        expect(result[0]).toMatchObject({ pattern: "REPEATED_FAILURE", occurrences: 2, failedOccurrences: 2, confidence: 0 });
    });
});
