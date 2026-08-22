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
        title: { type: "string" },
        summary: { type: "string" },
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
        closing_question: { type: "string" },
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

function clean(value: string): string {
    return value.trim();
}

function renderSection(section: LexResponseSection): string[] {
    const lines: string[] = [];
    const heading = clean(section.heading);

    if (heading) lines.push(`**${heading}**`);

    for (const bullet of section.bullets) {
        const value = clean(bullet);
        if (value) lines.push(`• ${value}`);
    }

    return lines;
}

function pushChunk(chunks: string[], value: string): void {
    const cleaned = value.trim();
    if (!cleaned) return;

    const MAX_MESSAGE_LENGTH = 1600;

    if (cleaned.length <= MAX_MESSAGE_LENGTH) {
        chunks.push(cleaned);
        return;
    }

    const lines = cleaned.split("\n");
    let current = "";

    for (const line of lines) {
        const candidate = current ? `${current}\n${line}` : line;

        if (candidate.length <= MAX_MESSAGE_LENGTH) {
            current = candidate;
            continue;
        }

        if (current) chunks.push(current.trim());

        if (line.length <= MAX_MESSAGE_LENGTH) {
            current = line;
            continue;
        }

        for (let index = 0; index < line.length; index += MAX_MESSAGE_LENGTH) {
            chunks.push(line.slice(index, index + MAX_MESSAGE_LENGTH).trim());
        }
        current = "";
    }

    if (current.trim()) chunks.push(current.trim());
}

/**
 * Render LEX like an executive partner rather than a status dashboard.
 * The structured response remains machine-friendly; presentation stays human.
 */
export function renderLexDiscordMessages(
    response: LexStructuredResponse,
): string[] {
    const chunks: string[] = [];
    const title = clean(response.title);
    const summary = clean(response.summary);

    // Casual conversation should feel like conversation, not a report card.
    if (response.type === "casual") {
        pushChunk(chunks, [summary, clean(response.closing_question)]
            .filter(Boolean)
            .join("\n\n"));
        return chunks.length > 0
            ? chunks
            : ["I’m here. What are we working on?"];
    }

    // Questions should answer first and avoid unnecessary dashboard framing.
    if (response.type === "question") {
        pushChunk(chunks, [summary, clean(response.closing_question)]
            .filter(Boolean)
            .join("\n\n"));
        return chunks.length > 0
            ? chunks
            : ["What would you like me to look at?"];
    }

    // For operational recommendations/decisions, lead with the human summary.
    // This keeps LEX concise while still preserving the structured details below.
    const opening = [
        title ? `**${title}**` : "",
        summary,
    ]
        .filter(Boolean)
        .join("\n\n");

    pushChunk(chunks, opening || "Here’s what I found.");

    for (const section of response.sections) {
        const rendered = renderSection(section);
        if (rendered.length === 0) continue;
        pushChunk(chunks, rendered.join("\n"));
    }

    if (response.actions.length > 0) {
        const actionLines = response.actions
            .map((action, index) => {
                const value = clean(action);
                return value ? `${index + 1}. ${value}` : "";
            })
            .filter(Boolean);

        if (actionLines.length > 0) {
            const heading = response.type === "recommendation"
                ? "**What I recommend**"
                : response.type === "decision"
                    ? "**Decision**"
                    : "**Next moves**";
            pushChunk(chunks, [heading, ...actionLines].join("\n"));
        }
    }

    const closingQuestion = clean(response.closing_question);
    if (closingQuestion) pushChunk(chunks, closingQuestion);

    return chunks.length > 0
        ? chunks
        : ["I’m here. What would you like me to work on?"];
}

export function renderLexDiscordResponse(
    response: LexStructuredResponse,
): string {
    return renderLexDiscordMessages(response).join("\n\n");
}
