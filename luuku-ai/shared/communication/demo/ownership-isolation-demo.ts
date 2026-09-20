import { InMemoryCommunicationService } from "../in-memory-communication-service";

async function runValidation() {
    const service = new InMemoryCommunicationService();

    const companyA = {
        ownership: { scope: "COMPANY" as const, companyId: "company-a" },
    };
    const companyB = {
        ownership: { scope: "COMPANY" as const, companyId: "company-b" },
    };

    await service.receiveMessage({
        channel: "email",
        sender: {
            channel: "email",
            externalId: "prospect@example.com",
        },
        content: "Company A private conversation",
        conversationId: "shared-conversation-id",
        context: companyA,
    });

    const hiddenFromB = await service.getConversation(
        "shared-conversation-id",
        companyB,
    );

    if (hiddenFromB !== null) {
        throw new Error("TENANT_ISOLATION_VALIDATION_FAILED: cross-company read succeeded");
    }

    let writeBlocked = false;

    try {
        await service.sendMessage({
            conversationId: "shared-conversation-id",
            channel: "email",
            recipient: {
                channel: "email",
                externalId: "prospect@example.com",
            },
            content: "Cross-company write attempt",
            context: companyB,
        });
    } catch (error) {
        writeBlocked =
            error instanceof Error &&
            error.message === "COMMUNICATION_CONVERSATION_OWNERSHIP_MISMATCH";
    }

    if (!writeBlocked) {
        throw new Error("TENANT_ISOLATION_VALIDATION_FAILED: cross-company write was not blocked");
    }

    const companyAView = await service.getConversation(
        "shared-conversation-id",
        companyA,
    );

    if (!companyAView || companyAView.messages.length !== 1) {
        throw new Error("TENANT_ISOLATION_VALIDATION_FAILED: owner lost access to its conversation");
    }

    console.log("");
    console.log("========================================");
    console.log("   COMMUNICATION TENANT ISOLATION");
    console.log("========================================");
    console.log("");
    console.log("Company A → conversation created : PASS");
    console.log("Company B → cross-tenant read     : BLOCKED");
    console.log("Company B → cross-tenant write    : BLOCKED");
    console.log("Company A → owner read            : PASS");
    console.log("");
    console.log("COMMUNICATION TENANT ISOLATION: PASS");
    console.log("");
}

runValidation().catch((error) => {
    console.error("Communication tenant isolation validation failed:", error);
    process.exitCode = 1;
});
