import {
    AgentTask,
    AgentResult
} from "../../../shared/agents/interface";

import {
    executeVoiceTask
} from "../../communication/voice/execute";

import {
    executeEmailTask
} from "../../communication/email/execute";

import {
    resolveTaskContext
} from "../../../shared/context/resolver";

import {
    resolveContact
} from "../../../shared/crm/resolver";

import {
    validateContact
} from "../../../shared/crm/validator";

import {
    requestContactEnrichment
} from "../../../shared/crm/enrichment";

import {
    activityService
} from "../../../shared/database/services/activity.service";

function extractContactEmail(
    text: string
): string | undefined {
    const match = text.match(
        /CONTACT_EMAIL:\s*([^\s\n\r]+)/i
    );

    return match?.[1]?.trim() || undefined;
}

function extractTestContactCompany(
    text: string
): string | undefined {
    const match = text.match(
        /TEST_CONTACT_COMPANY:\s*([^\n\r]+)/i
    );

    return match?.[1]?.trim() || undefined;
}

function isControlledTestTask(
    text: string
): boolean {
    return /TEST_CONTACT_COMPANY\s*:|CONTROLLED TEST CONTACT|test follow-up email/i.test(
        text
    );
}

function isOverdueCrmPrioritization(
    task: AgentTask
): boolean {
    // An explicit capability contract always wins over prose-based intent
    // detection. A task approved as email.send must never be swallowed by
    // the generic overdue-CRM prioritization branch just because its
    // description mentions an overdue follow-up.
    if (task.metadata?.operation === "email.send") return false;

    const operation = task.metadata?.operation;
    if (operation === "crm.prioritize_overdue") return true;

    const text = `${task.title}\n${task.description}`.toLowerCase();
    return text.includes("overdue crm") &&
        (text.includes("prioritize") || text.includes("follow-up"));
}

async function executeOverdueCrmPrioritization(
    task: AgentTask
): Promise<AgentResult> {
    const requestedLimit = Number(task.metadata?.limit ?? 5);
    const limit = Number.isFinite(requestedLimit)
        ? Math.max(1, Math.min(10, Math.floor(requestedLimit)))
        : 5;

    console.log("");
    console.log("========================================");
    console.log("   REAL CRM PRIORITIZATION");
    console.log("========================================");
    console.log("");

    const before = await activityService.getOverdueActivities();

    if (before.length === 0) {
        return {
            success: true,
            summary: "No overdue CRM activities remain to prioritize.",
            completedAt: new Date().toISOString(),
            executionStatus: "completed",
            executed: true,
            verified: true,
            verificationNotes: [
                "PostgreSQL returned zero incomplete activities with a dueAt timestamp in the past."
            ]
        };
    }

    // Put the known Rwanda Revenue Authority follow-up first when it exists,
    // then use oldest due date first so the operation is deterministic.
    const ranked = [...before].sort((a, b) => {
        const aRra = /rwanda revenue authority|rra/i.test(`${a.title} ${a.description}`) ? 0 : 1;
        const bRra = /rwanda revenue authority|rra/i.test(`${b.title} ${b.description}`) ? 0 : 1;
        if (aRra !== bRra) return aRra - bRra;

        return (a.dueAt ?? a.createdAt).localeCompare(
            b.dueAt ?? b.createdAt
        );
    });

    const selected = ranked.slice(0, limit);

    const updated = [] as typeof selected;

    for (const activity of selected) {
        updated.push(
            await activityService.markPrioritized(activity)
        );
    }

    // Re-read the exact records that were mutated. Prioritization is NOT
    // completion: the activities must remain open and therefore remain overdue.
    const verifiedRecords =
        await activityService.getActivitiesByIds(
            selected.map(activity => activity.id)
        );

    const verificationPassed =
        verifiedRecords.length === selected.length &&
        selected.every(selectedActivity => {
            const persisted = verifiedRecords.find(
                activity => activity.id === selectedActivity.id
            );

            return Boolean(
                persisted &&
                !persisted.completed &&
                persisted.outcome === "Prioritized for follow-up by Lex Executive AI" &&
                persisted.description.includes("[LEX PRIORITY: HIGH]")
            );
        });

    const after = await activityService.getOverdueActivities();

    console.log(`Overdue before   : ${before.length}`);
    console.log(`Activities selected: ${selected.length}`);
    console.log(`Overdue after    : ${after.length}`);
    console.log(`Database mutation: ${verificationPassed ? "PASSED" : "FAILED"}`);
    console.log(`Verification     : ${verificationPassed ? "PASSED" : "FAILED"}`);

    if (!verificationPassed) {
        return {
            success: false,
            summary: "CRM prioritization did not pass exact database verification. No communication was sent.",
            completedAt: new Date().toISOString(),
            executionStatus: "failed",
            executed: updated.length > 0,
            verified: false,
            verificationNotes: [
                `Selected ${selected.length} overdue activities.`,
                `Re-read ${verifiedRecords.length} selected activity records from PostgreSQL.`,
                "Every selected record must remain incomplete and contain the Lex priority outcome and marker."
            ],
            blockers: ["Exact CRM mutation verification failed."]
        };
    }

    const names = selected
        .map(activity => activity.title)
        .slice(0, 3)
        .join("; ");

    return {
        success: true,
        summary: `Prioritized ${selected.length} overdue CRM activities in PostgreSQL. ${after.length} overdue activities remain open for follow-up.${names ? ` Examples: ${names}.` : ""}`,
        completedAt: new Date().toISOString(),
        executionStatus: "completed",
        executed: true,
        verified: true,
        verificationNotes: [
            `PostgreSQL mutation verified for ${selected.length} selected activity records.`,
            "Selected activities remain incomplete; prioritization did not falsely mark work as completed.",
            `${after.length} activities remain overdue after prioritization.`
        ],
        evidence: {
            reference: `crm-prioritize:${selected.map(activity => activity.id).join(",")}`
        }
    };
}

export async function executeSalesWorkflow(

    task: AgentTask

): Promise<AgentResult> {

    console.log("");

    console.log("========================================");
    console.log("        SALES WORKFLOW");
    console.log("========================================");
    console.log("");

    if (isOverdueCrmPrioritization(task)) {
        return executeOverdueCrmPrioritization(task);
    }

    const rawText =
        task.title +
        "\n" +
        task.description;

    const text = rawText.toLowerCase();

    const context =
        await resolveTaskContext(task);

    const preferredContactEmail =
        extractContactEmail(rawText);

    const controlledTest =
        isControlledTestTask(rawText);

    const isInboundEmailReply =
        /^INBOUND_REPLY=true$/im.test(task.description);

    const requiresEmail =
        isInboundEmailReply ||
        text.includes("email") ||
        text.includes("e-mail");

    const requiresVoice =
        text.includes("call") ||
        text.includes("phone") ||
        text.includes("meeting");

    const validationChannel =
        requiresEmail && !requiresVoice
            ? "email"
            : requiresVoice
                ? "voice"
                : undefined;

    const requestedCompany =
        extractTestContactCompany(rawText) ||
        context.companyName;

    let activeContact =
        await resolveContact(
            requestedCompany,
            preferredContactEmail
        );

    if (
        controlledTest &&
        preferredContactEmail &&
        activeContact?.email?.toLowerCase() !==
            preferredContactEmail.toLowerCase()
    ) {
        activeContact = undefined;
    }

    if (!activeContact) {

        console.log("");
        console.log("========================================");
        console.log("      CRM VALIDATION");
        console.log("========================================");
        console.log("");
        console.log("Status : FAILED");
        console.log("");
        console.log("Reason:");
        console.log(
            controlledTest && preferredContactEmail
                ? `• Controlled test contact ${preferredContactEmail} was not found in PostgreSQL for company ${requestedCompany}.`
                : "• No contact found in PostgreSQL."
        );
        console.log("");

        if (controlledTest) {
            return {
                success: false,
                summary:
                    `Controlled test stopped: CRM contact ${preferredContactEmail || ""} at ${requestedCompany} was not found. No enrichment or external communication was attempted.`,
                completedAt: new Date().toISOString(),
                executionStatus: "blocked",
                executed: false,
                verified: false
            };
        }

        const enrichment =
            await requestContactEnrichment({
                company: context.companyName,
                reasons: [
                    "No contact found in PostgreSQL."
                ]
            });

        if (!enrichment.success) {
            return {
                success: false,
                summary:
                    "Sales workflow could not enrich the missing CRM contact.",
                completedAt: new Date().toISOString(),
                executionStatus: "failed",
                executed: false,
                verified: false
            };
        }

        activeContact = enrichment.contact;
    }

    let validation =
        validateContact(
            activeContact,
            validationChannel
        );

    console.log("");
    console.log("========================================");
    console.log("      CRM VALIDATION");
    console.log("========================================");
    console.log("");

    if (!validation.ready) {

        console.log("Status : FAILED");
        console.log("");
        console.log("Reasons:");

        for (const reason of validation.reasons) {
            console.log(`• ${reason}`);
        }

        console.log("");

        if (controlledTest) {
            return {
                success: false,
                summary:
                    `Controlled test stopped because CRM validation for ${preferredContactEmail || requestedCompany} is incomplete. No enrichment or external communication was attempted.`,
                completedAt: new Date().toISOString(),
                executionStatus: "blocked",
                executed: false,
                verified: false
            };
        }

        const enrichment =
            await requestContactEnrichment({
                company: context.companyName,
                reasons: validation.reasons
            });

        if (!enrichment.success) {
            return {
                success: false,
                summary:
                    "Sales workflow could not complete CRM enrichment.",
                completedAt: new Date().toISOString(),
                executionStatus: "failed",
                executed: false,
                verified: false
            };
        }

        activeContact = enrichment.contact;

        validation =
            validateContact(
                activeContact,
                validationChannel
            );

        if (!validation.ready) {
            console.log("");
            console.log("CRM enrichment failed.");

            return {
                success: false,
                summary:
                    "Sales workflow stopped because CRM validation is still incomplete.",
                completedAt: new Date().toISOString(),
                executionStatus: "failed",
                executed: false,
                verified: false
            };
        }

        console.log("");
        console.log("✓ CRM successfully enriched.");
    }

    console.log("Status : PASSED");
    console.log("");
    console.log("CRM ready for communication.");
    console.log("");

    if (isInboundEmailReply) {
        console.log("✓ Inbound email reply — email channel required");
        console.log("");

        return executeEmailTask(
            task,
            activeContact
        );
    }

    if (requiresEmail && !requiresVoice) {
        console.log("✓ Real email communication required");
        console.log("");

        return executeEmailTask(
            task,
            activeContact
        );
    }

    if (requiresVoice) {
        console.log("✓ Communication required");
        console.log("");

        return executeVoiceTask(
            task,
            activeContact
        );
    }

    console.log("✓ No communication required");

    return {
        success: true,
        summary:
            `Sales CRM workflow completed "${task.title}". No external communication was required.`,
        completedAt: new Date().toISOString(),
        executionStatus: "completed",
        executed: true,
        verified: false
    };

}
