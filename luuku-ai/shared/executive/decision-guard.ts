import { buildExecutiveCapabilities } from "./capabilities";

export interface ExecutiveDecisionGuardResult {
    allowed: boolean;
    blockers: string[];
}

function containsAny(text: string, patterns: RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(text));
}

function capabilityStatus(id: string) {
    return buildExecutiveCapabilities().find((capability) => capability.id === id)?.status;
}

function findCapabilityBlockers(text: string): string[] {
    const blockers: string[] = [];

    // Guard actual outbound actions, not references to capabilities, gaps,
    // escalation plans, or reports about unavailable integrations.
    const requiresEmail = containsAny(text, [
        /\b(?:send|send out|deliver|dispatch)\s+(?:a\s+|the\s+|this\s+)?(?:real\s+)?e-?mail\b/i,
        /\b(?:send|deliver|dispatch)\s+(?:a\s+)?(?:real\s+)?outbound\s+e-?mail\b/i,
        /\be-?mail\s+(?:the|a)\s+(?:prospect|contact|customer|company)\s+(?:now|immediately|today)\b/i,
    ]);

    if (requiresEmail) {
        const status = capabilityStatus("email.send");
        if (status !== "available") {
            blockers.push(`email.send is ${status ?? "unknown"}; real outbound email cannot be executed.`);
        }
    }

    const requiresVoice = containsAny(text, [
        /\b(?:place|make|start|initiate)\s+(?:a\s+)?(?:real\s+)?(?:phone\s+)?call\b/i,
        /\bdial(?:ing)?\s+(?:the\s+)?(?:prospect|contact|customer|company|rra)\b/i,
        /\bcall\s+(?:the\s+)?(?:prospect|contact|customer|company|rra)\s+(?:now|immediately|today)\b/i,
        /\b(?:leave|send)\s+(?:a\s+)?voicemail\b/i,
    ]);

    if (requiresVoice) {
        const status = capabilityStatus("voice.call");
        if (status !== "available") {
            blockers.push(`voice.call is ${status ?? "unknown"}; external calling cannot be executed.`);
        }
    }

    const requiresCalendar = containsAny(text, [
        /\b(?:schedule|book|arrange|set\s+up)\s+(?:a\s+|the\s+|this\s+)?(?:meeting|call|demo)\b/i,
        /\bcreate\s+(?:a\s+)?calendar\s+invite\b/i,
        /\bschedule\s+(?:a\s+)?calendar\s+(?:event|invite)\b/i,
    ]);

    if (requiresCalendar) {
        const status = capabilityStatus("calendar.schedule");
        if (status !== "available") {
            blockers.push(`calendar.schedule is ${status ?? "unknown"}; external calendar scheduling cannot be executed.`);
        }
    }

    return blockers;
}

function findPastSchedulingBlockers(text: string): string[] {
    const blockers: string[] = [];

    const now = new Date();
    const localParts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Africa/Kigali",
        year: "numeric",
        month: "short",
        day: "numeric",
        weekday: "short",
    }).formatToParts(now);

    const day = Number(localParts.find((part) => part.type === "day")?.value ?? 0);
    const month = localParts.find((part) => part.type === "month")?.value ?? "";
    const weekday = localParts.find((part) => part.type === "weekday")?.value ?? "";
    const year = Number(localParts.find((part) => part.type === "year")?.value ?? 0);

    const localTime = new Intl.DateTimeFormat("en-US", {
        timeZone: "Africa/Kigali",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(now);

    const currentHour = Number(localTime.find((part) => part.type === "hour")?.value ?? 0);
    const currentMinute = Number(localTime.find((part) => part.type === "minute")?.value ?? 0);
    const currentMinutes = currentHour * 60 + currentMinute;

    const dayPattern = new RegExp(
        `(?:today|${weekday})\\s+${day}\\s+${month}\\s+(?:${year}\\s+)?(?:at\\s+)?(\\d{1,2}):(\\d{2})\\s*(?:CAT|Kigali)?`,
        "i",
    );

    const todayPattern = /\btoday\b[^\n]{0,80}?(?:at\s+)?(\d{1,2}):(\d{2})\s*(?:CAT|Kigali)?/i;

    const matches = [text.match(dayPattern), text.match(todayPattern)].filter(Boolean) as RegExpMatchArray[];

    for (const match of matches) {
        const hour = Number(match[1]);
        const minute = Number(match[2]);
        if (hour > 23 || minute > 59) continue;

        const requestedMinutes = hour * 60 + minute;
        if (requestedMinutes < currentMinutes) {
            blockers.push(
                `scheduled time ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} CAT is already in the past; current Kigali time is ${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")} CAT.`,
            );
            break;
        }
    }

    return blockers;
}

export function guardExecutiveDecision(decisionText: string): ExecutiveDecisionGuardResult {
    const blockers = [
        ...findCapabilityBlockers(decisionText),
        ...findPastSchedulingBlockers(decisionText),
    ];

    return {
        allowed: blockers.length === 0,
        blockers,
    };
}
