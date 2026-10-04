import { communicationRouter } from "../router.js";
import type { CommunicationAdapter, CommunicationRequest } from "../types.js";

async function main(): Promise<void> {
    let providerCalls = 0;

    const adapter: CommunicationAdapter = {
        capability: "email.send",
        channel: "internal",
        isAvailable: () => true,
        async execute(_request: CommunicationRequest) {
            providerCalls += 1;

            throw new Error(
                "Simulated transport timeout after the provider boundary was entered.",
            );
        },
    };

    communicationRouter.register(adapter);

    const request: CommunicationRequest = {
        capability: "email.send",
        channel: "internal",
        recipientExternalId: "phase5-unknown-test",
        subject: "Phase 5 unknown outcome regression",
        body: "This request must never be automatically replayed.",
        metadata: {
            audience: "internal",
            executionMode: "test",
            idempotencyKey: "phase5/communication/unknown-regression",
            source: "phase5-communication-unknown-regression",
        },
    };

    const first = await communicationRouter.execute(request);

    if (first.status !== "unknown") {
        throw new Error(
            `Expected UNKNOWN after adapter transport failure, got ${first.status}.`,
        );
    }

    if (first.executed || first.verified) {
        throw new Error("UNKNOWN outcome must not claim verified execution.");
    }

    const second = await communicationRouter.execute(request);

    if (second.status !== "unknown") {
        throw new Error(
            `Expected durable UNKNOWN replay result, got ${second.status}.`,
        );
    }

    if (providerCalls !== 1) {
        throw new Error(
            `UNKNOWN outcome was replayed into the provider ${providerCalls} times.`,
        );
    }

    console.log("");
    console.log("V8 — PHASE 5 COMMUNICATION UNKNOWN-OUTCOME ATTACK");
    console.log("Provider boundary entered       : PASS");
    console.log("Transport uncertainty classified: PASS");
    console.log("Durable UNKNOWN outcome         : PASS");
    console.log("Automatic UNKNOWN retry         : BLOCKED");
    console.log("Provider executions             :", providerCalls);
    console.log("PHASE 5 COMMUNICATION UNKNOWN SAFETY: PASS");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
