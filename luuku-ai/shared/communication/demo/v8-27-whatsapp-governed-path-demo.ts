import { communicationExecutionService } from "../communication-execution.service";
import { prisma } from "../../database/client";
import { CommunicationRouter } from "../router";
import { WhatsAppCloudApiAdapter, type WhatsAppFetch } from "../whatsapp-cloud-api-adapter";
import { WhatsAppRouterAdapter } from "../whatsapp-router-adapter";
import type { CommunicationRequest } from "../types";

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(message);
}

const controlledRecipient = "+250788123456";
const runId = Date.now().toString() + "-" + process.pid;
const key = (name: string) => "v8.27-whatsapp-" + runId + "-" + name;
const runtimeConfig = {
    whatsappAccessToken: "synthetic-token",
    whatsappPhoneNumberId: "synthetic-phone-number-id",
    whatsappGraphApiVersion: "v99.0",
    whatsappMode: "live",
    whatsappTestRecipient: controlledRecipient,
    whatsappLiveConfirmation: "SEND_TO_CONTROLLED_TEST_CONTACT",
};

function request(
    idempotencyKey: string,
    audience: "internal" | "external" = "internal",
    executionMode: string | null = "live",
): CommunicationRequest {
    return {
        capability: "whatsapp.send",
        channel: "whatsapp",
        recipientExternalId: controlledRecipient,
        body: "Governed-path synthetic test; no real message.",
        metadata: {
            audience,
            executionMode: executionMode === null ? undefined : executionMode,
            companyId: audience === "external" ? undefined : undefined,
            idempotencyKey,
        },
    };
}

function makeRouter(fetchImpl: WhatsAppFetch) {
    const cloudAdapter = new WhatsAppCloudApiAdapter({
        accessToken: runtimeConfig.whatsappAccessToken,
        phoneNumberId: runtimeConfig.whatsappPhoneNumberId,
        graphApiVersion: runtimeConfig.whatsappGraphApiVersion,
        mode: runtimeConfig.whatsappMode,
        testRecipient: runtimeConfig.whatsappTestRecipient,
        liveConfirmation: runtimeConfig.whatsappLiveConfirmation,
    }, fetchImpl);
    const whatsapp = new WhatsAppRouterAdapter(runtimeConfig, cloudAdapter);
    const router = new CommunicationRouter(communicationExecutionService);
    router.register(whatsapp);
    return { router };
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

    const { router } = makeRouter(fakeFetch);

    const testMode = await router.execute(request(key("test-mode"), "internal", "test"));
    assert(testMode.status === "blocked", "Request executionMode=test must be blocked.");
    assert(testMode.error === "WHATSAPP_REQUEST_LIVE_CONSENT_REQUIRED", "Unexpected test-mode block reason: " + String(testMode.error) + " / " + testMode.summary);
    assert(Number(providerCalls) === 0, "Request executionMode=test must not reach the provider.");

    const missingMode = await router.execute(request(key("missing-mode"), "internal", null));
    assert(missingMode.status === "blocked", "Missing request executionMode must be blocked.");
    assert(missingMode.error === "WHATSAPP_REQUEST_LIVE_CONSENT_REQUIRED", "Unexpected missing-mode block reason.");
    assert(Number(providerCalls) === 0, "Missing request executionMode must not reach the provider.");

    const first = await router.execute(request(key("success")));
    assert(first.status === "verified" && first.executed && first.verified, "Expected governed success result.");
    assert(first.evidence?.provider === "whatsapp-cloud-api", "Provider evidence was not attached.");
    assert(first.evidence?.externalId === "wamid.synthetic-governed-001", "Provider message ID missing from evidence.");
    assert(Number(providerCalls) === 1, "Expected one fake provider call.");
    const persistedSuccess = await prisma.communicationExecution.findUnique({ where: { idempotencyKey: key("success") } });
    assert(persistedSuccess?.status === "verified", "Successful WhatsApp result was not persisted by the real execution ledger.");
    assert(persistedSuccess?.externalId === "wamid.synthetic-governed-001", "Provider evidence was not persisted by the real execution ledger.");

    const replay = await router.execute(request(key("success")));
    assert(replay.status === "verified", "Idempotent replay should return the stored result.");
    assert(Number(providerCalls) === 1, "Idempotent replay dispatched the provider again.");
    const persistedReplay = await prisma.communicationExecution.findUnique({ where: { idempotencyKey: key("success") } });
    assert(persistedReplay?.status === "verified", "Replay changed the persisted terminal success state.");

    let ambiguousProviderCalls = 0;
    const ambiguousFetch: WhatsAppFetch = async () => {
        ambiguousProviderCalls += 1;
        throw new Error("synthetic socket reset after possible provider acceptance");
    };
    const ambiguous = makeRouter(ambiguousFetch);
    const uncertain = await ambiguous.router.execute(request(key("unknown")));
    assert(uncertain.status === "unknown", "Ambiguous transport failure must be recorded as UNKNOWN.");
    assert(ambiguousProviderCalls === 1, "Expected exactly one ambiguous provider attempt.");
    const uncertainReplay = await ambiguous.router.execute(request(key("unknown")));
    assert(uncertainReplay.status === "unknown", "UNKNOWN replay must remain fail-closed.");
    assert(ambiguousProviderCalls === 1, "UNKNOWN replay must not automatically resend.");
    const persistedUnknown = await prisma.communicationExecution.findUnique({ where: { idempotencyKey: key("unknown") } });
    assert(persistedUnknown?.status === "unknown", "Ambiguous provider outcome was not persisted as UNKNOWN by the real ledger.");

    let rejectedProviderCalls = 0;
    const rejected = makeRouter(async () => {
        rejectedProviderCalls += 1;
        if (rejectedProviderCalls === 1) {
            return new Response(
                JSON.stringify({ error: { message: "synthetic invalid payload", code: 100 } }),
                { status: 400, statusText: "Bad Request" },
            );
        }
        return new Response(
            JSON.stringify({ messaging_product: "whatsapp", messages: [{ id: "wamid.synthetic-retry-001" }] }),
            { status: 200, headers: { "Content-Type": "application/json" } },
        );
    });
    const rejectionRequest = request(key("rejection"));
    const rejection = await rejected.router.execute(rejectionRequest);
    assert(rejection.status === "failed", "Explicit non-2xx provider rejection must be failed, not UNKNOWN.");
    assert(rejection.error === "WHATSAPP_PROVIDER_REJECTED_400", "Unexpected explicit-rejection error code.");
    const persistedRejection = await prisma.communicationExecution.findUnique({ where: { idempotencyKey: key("rejection") } });
    assert(persistedRejection?.status === "failed", "Explicit rejection was not persisted as failed before retry.");
    const safeRetry = await rejected.router.execute(rejectionRequest);
    assert(safeRetry.status === "verified", "System-scoped explicit rejection should safely retry with the same idempotency key.");
    assert(safeRetry.evidence?.externalId === "wamid.synthetic-retry-001", "Safe retry did not persist the accepted provider message ID.");
    assert(rejectedProviderCalls === 2, "Expected one explicit rejection followed by one permitted retry.");

    let blockedProviderCalls = 0;
    const blocked = makeRouter(async () => {
        blockedProviderCalls += 1;
        return new Response(JSON.stringify({ messages: [{ id: "should-not-exist" }] }), { status: 200 });
    });
    const policyBlocked = await blocked.router.execute(request(key("policy-block"), "external"));
    assert(policyBlocked.status === "blocked", "External communication without tenant company context must be blocked by policy.");
    assert(policyBlocked.error === "COMMUNICATION_TENANT_CONTEXT_REQUIRED", "Unexpected policy block reason.");
    assert(blockedProviderCalls === 0, "Policy-blocked request must never reach the provider.");

    console.log("PHASE 5.5 — GOVERNED WHATSAPP ROUTER PATH");
    console.log("Request-level live consent blocks test/missing executionMode with zero provider calls: PASS");
    console.log("Real Prisma/PostgreSQL ledger persists provider evidence and terminal outcomes: PASS");
    console.log("Communication policy → execution ledger lifecycle → WhatsApp adapter → provider evidence: PASS");
    console.log("Idempotent replay returns stored result without another provider call: PASS");
    console.log("Ambiguous provider outcome persists UNKNOWN and blocks automatic replay: PASS");
    console.log("Explicit HTTP rejection is failed and system-scoped retry succeeds with same key: PASS");
    console.log("Missing external tenant context is blocked before provider dispatch: PASS");
    console.log("Real WhatsApp network requests made: 0 (injected fake transport only)");
    console.log("PHASE 5.5 GOVERNED WHATSAPP PATH: PASS");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
