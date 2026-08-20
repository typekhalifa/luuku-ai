export const LEX_RESPONSE_SCHEMA = {
    type: "object",
    additionalProperties: false,
    properties: {
        type: {
            type: "string",
            enum: [
                "company_update",
                "analysis",
                "recommendation",
                "decision",
                "question",
                "casual",
            ],
        },
        title: {
            type: "string",
        },
        summary: {
            type: "string",
        },
        sections: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    heading: { type: "string" },
                    bullets: {
                        type: "array",
                        items: { type: "string" },
                    },
                },
                required: ["heading", "bullets"],
            },
        },
        actions: {
            type: "array",
            items: { type: "string" },
        },
        closing_question: {
            type: "string",
        },
    },
    required: [
        "type",
        "title",
        "summary",
        "sections",
        "actions",
        "closing_question",
    ],
} as const;

export type LexResponseType =
    | "company_update"
    | "analysis"
    | "recommendation"
    | "decision"
    | "question"
    | "casual";

export interface LexResponseSection {
    heading: string;
    bullets: string[];
}

export interface LexStructuredResponse {
    type: LexResponseType;
    title: string;
    summary: string;
    sections: LexResponseSection[];
    actions: string[];
    closing_question: string;
}

const TYPE_ICON: Record<LexResponseType, string> = {
    company_update: "📊",
    analysis: "🧠",
    recommendation: "🎯",
    decision: "⚡",
    question: "💬",
    casual: "🤖",
};

function clean(value: string): string {
    return value.trim();
}

function renderSection(section: LexResponseSection): string[] {
    const lines: string[] = [];
    const heading = clean(section.heading);

    if (heading) {
        lines.push(`**${heading}**`);
    }

    for (const bullet of section.bullets) {
        const value = clean(bullet);
        if (value) lines.push(`• ${value}`);
    }

    return lines;
}

export function renderLexDiscordResponse(
    response: LexStructuredResponse,
): string {
    const icon = TYPE_ICON[response.type];
    const lines: string[] = [];
    const title = clean(response.title) || "LEX";
    const summary = clean(response.summary);

    lines.push(`${icon} **${title}**`);

    if (summary) {
        lines.push("");
        lines.push(summary);
    }

    for (const section of response.sections) {
        const rendered = renderSection(section);
        if (rendered.length === 0) continue;
        lines.push("");
        lines.push(...rendered);
    }

    if (response.actions.length > 0) {
        lines.push("");
        lines.push("**Next moves**");
        response.actions.forEach((action, index) => {
            const value = clean(action);
            if (value) lines.push(`${index + 1}. ${value}`);
        });
    }

    const closingQuestion = clean(response.closing_question);
    if (closingQuestion) {
        lines.push("");
        lines.push(`💬 ${closingQuestion}`);
    }

    return lines.join("\n").trim();
}
