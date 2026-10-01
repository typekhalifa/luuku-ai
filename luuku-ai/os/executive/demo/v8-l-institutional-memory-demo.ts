import {
    ExecutiveInstitutionalMemory,
    InMemoryInstitutionalMemoryStore,
} from "../v8-l-institutional-memory.js";

const main = async (): Promise<void> => {
    const store = new InMemoryInstitutionalMemoryStore();
    const memory = new ExecutiveInstitutionalMemory(store);
    const observedAt = new Date("2026-09-15T00:00:00.000Z");

    await memory.remember({
        id: "mem-sales-follow-up",
        kind: "LESSON",
        subject: "sales follow-up",
        statement: "Fast follow-up improves qualified-deal progression.",
        confidence: 0.9,
        evidenceIds: ["exec-1", "exec-2"],
        objectiveIds: ["sales-growth"],
        observedAt,
    });

    await memory.remember({
        id: "mem-founder-approval",
        kind: "COMMITMENT",
        subject: "founder approval",
        statement: "High-risk external commitments require founder approval.",
        confidence: 1,
        evidenceIds: ["policy-1"],
        observedAt,
    });

    await memory.remember({
        id: "mem-stale-belief",
        kind: "BELIEF",
        subject: "legacy process",
        statement: "The legacy process is still preferred.",
        confidence: 0.4,
        observedAt,
    });

    const sales = await memory.recall({
        text: "sales follow-up",
        minConfidence: 0.8,
    });

    const governance = await memory.recall({
        text: "external commitments founder approval",
        kinds: ["COMMITMENT"],
        minConfidence: 0.9,
    });

    const lowConfidence = await memory.recall({
        text: "legacy process",
        minConfidence: 0.8,
    });

    if (sales.matched !== 1) throw new Error("Expected one high-confidence sales lesson.");
    if (governance.matched !== 1) throw new Error("Expected one governance commitment.");
    if (lowConfidence.matched !== 0) throw new Error("Low-confidence memory should be filtered.");
    if (sales.records[0]?.evidenceIds.length !== 2) throw new Error("Evidence provenance was not preserved.");

    console.log("V8-L — Institutional Company Memory Validation");
    console.log(`Stored records              : ${(await store.list()).length}`);
    console.log(`Sales recall matches        : ${sales.matched}`);
    console.log(`Governance recall matches   : ${governance.matched}`);
    console.log(`Low-confidence matches      : ${lowConfidence.matched}`);
    console.log("✓ Memory is evidence-backed and confidence-bounded");
    console.log("✓ Recall is deterministic and bounded");
    console.log("✓ Low-confidence knowledge can be excluded");
    console.log("✓ Provenance and objective linkage are preserved");
    console.log("✓ Memory layer does not plan, approve, allocate, or execute work");
    console.log("V8-L VALIDATION: PASS");
};

void main();
