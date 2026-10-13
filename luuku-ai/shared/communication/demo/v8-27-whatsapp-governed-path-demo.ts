import { CommunicationExecutionService } from "../communication-execution.service";
import { CommunicationRouter } from "../router";
import { WhatsAppCloudApiAdapter, type WhatsAppFetch } from "../whatsapp-cloud-api-adapter";
import { WhatsAppRouterAdapter } from "../whatsapp-router-adapter";
import type { CommunicationExecutionResult, CommunicationRequest } from "../types";

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(message);
}

const controlledRecipient = "+250788123456";
const runtimeConfig = {
    whatsappAccessToken: "synthetic-token",
    whatsappPhoneNumberId: "synthetic-phone-number-id",
    whatsappGraphApiVersion: "v99.0",
    whatsappMode: "live",
    whatsappTestRecipient: controlledRecipient,
    whatsappLiveConfirmation: "SEND_TO_CONTROLLED_TEST_CONTACT",
};

function request(idempotencyKey: string, audience: "internal" | "external" = "internal"): CommunicationRequest {
    return {
        capability: "whatsapp.send",
        channel: "whatsapp",
        recipientExternalId: controlledRecipient,
        body: "Governed-path synthetic test; no real message.",
        metadata: {
            audience,
            executionMode: "live",
            companyId: audience === "external" ? undefined : undefined,
            idempotencyKey,
            conversationId: "phase5.5-governed-path",
        },
    };
}

function makeLedger() {
    let storedResult: CommunicationExecutionResult | undefined;
    const events: string[] = [];
    const service: Pick<CommunicationExecutionService, "start" | "markExecuting" | "complete"> = {
        async start(_request, _policy) {
            events.push("start");
            if (storedResult) {
                return { id: "synthetic-execution-1", reused: true, existingResult: storedResult };
            }
            return { id: "synthetic-execution-1", reused: false };
        },
        async markExecuting(id) {
            assert(id === "synthetic-execution-1", "Unexpected execution ID marked executing.");
            events.push("markExecuting");
        },
        async complete(id, result) {
            assert(id === "synthetic-execution-1", "Unexpected execution ID completed.");
            events.push("complete");
            storedResult = result;
        },
    };
    return { service, events };
}

function makeRouter(fetchImpl: WhatsAppFetch, ledger = makeLedger()) {
    const cloudAdapter = new WhatsAppCloudApiAdapter({
        accessToken: runtimeConfig.whatsappAccessToken,
        phoneNumberId: runtimeConfig.whatsappPhoneNumberId,
        graphApiVersion: runtimeConfig.whatsappGraphApiVersion,
        mode: runtimeConfig.whatsappMode,
        testRecipient: runtimeConfig.whatsappTestRecipient,
        liveConfirmation: runtimeConfig.whatsappLiveConfirmation,
    }, fetchImpl);
    const whatsapp = new WhatsAppRouterAdapter(runtimeConfig, cloudAdapter);
    const router = new CommunicationRouter(ledger.service);
    router.register(whatsapp);
    return { router, ledger };
}

async function main(): Promise<void> {
    let providerCalls = 0;
    const fakeFetch: WhatsAppFetch = async () => {
        providerCalls += 1;
        return new Response(
            JSON.stringify({ messaging_product: "whatsapp", messages: [{ id: "wamid.synthetic-governed-001" }] }),
            { status: 200, headers: { "Content-Type": "application/json" } },
        );
    };

    const { router, ledger } = makeRouter(fakeFetch);
    const first = await router.execute(request("governed-success-001"));
    assert(first.status === "verified" && first.executed && first.verified, "Expected governed success result.");
    assert(first.evidence?.provider === "whatsapp-cloud-api", "Provider evidence was not attached.");
    assert(first.evidence?.externalId === "wamid.synthetic-governed-001", "Provider message ID missing from evidence.");
    assert(providerCalls === 1, "Expected one fake provider call.");
    assert(ledger.events.join(",") === "start,markExecuting,complete", "Router did not run the expected ledger lifecycle.");

    const replay = await router.execute(request("governed-success-001"));
    assert(replay.status === "verified", "Idempotent replay should return the stored result.");
    assert(providerCalls === 1, "Idempotent replay dispatched the provider again.");
    assert(ledger.events.join(",") === "start,markExecuting,complete,start", "Replay unexpectedly advanced the ledger lifecycle.");

    let ambiguousProviderCalls = 0;
    const ambiguousFetch: WhatsAppFetch = async () => {
        ambiguousProviderCalls += 1;
        throw new Error("synthetic socket reset after possible provider acceptance");
    };
    const ambiguous = makeRouter(ambiguousFetch);
    const uncertain = await ambiguous.router.execute(request("governed-unknown-001"));
    assert(uncertain.status === "unknown", "Ambiguous transport failure must be recorded as UNKNOWN.");
    assert(ambiguousProviderCalls === 1, "Expected exactly one ambiguous provider attempt.");
    const uncertainReplay = await ambiguous.router.execute(request("governed-unknown-001"));
    assert(uncertainReplay.status === "unknown", "UNKNOWN replay must remain fail-closed.");
    assert(ambiguousProviderCalls === 1, "UNKNOWN replay must not automatically resend.");

    let blockedProviderCalls = 0;
    const blocked = makeRouter(async () => {
        blockedProviderCalls += 1;
        return new Response(JSON.stringify({ messages: [{ id: "should-not-exist" }] }), { status: 200 });
    });
    const policyBlocked = await blocked.router.execute(request("governed-policy-block-001", "external"));
    assert(policyBlocked.status === "blocked", "External communication without tenant company context must be blocked by policy.");
    assert(policyBlocked.error === "COMMUNICATION_TENANT_CONTEXT_REQUIRED", "Unexpected policy block reason.");
    assert(blockedProviderCalls === 0, "Policy-blocked request must never reach the provider.");

    console.log("PHASE 5.5 — GOVERNED WHATSAPP ROUTER PATH");
    console.log("Communication policy → execution ledger lifecycle → WhatsApp adapter → provider evidence: PASS");
    console.log("Idempotent replay returns stored result without another provider call: PASS");
    console.log("Ambiguous provider outcome persists UNKNOWN and blocks automatic replay: PASS");
    console.log("Missing external tenant context is blocked before provider dispatch: PASS");
    console.log("Real network requests made: 0");
    console.log("PHASE 5.5 GOVERNED WHATSAPP PATH: PASS");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
