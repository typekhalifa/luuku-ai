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
        title: { type: "string", maxLength: 80 },
        summary: { type: "string", maxLength: 700 },
        sections: {
            type: "array",
            maxItems: 1,
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    heading: { type: "string", maxLength: 60 },
                    bullets: {
                        type: "array",
                        maxItems: 4,
                        items: { type: "string", maxLength: 240 },
                    },
                },
                required: ["heading", "bullets"],
            },
        },
        actions: {
            type: "array",
            maxItems: 3,
            items: { type: "string", maxLength: 240 },
        },
        closing_question: { type: "string", maxLength: 180 },
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

    if (response.type === "casual") {
        pushChunk(chunks, [summary, clean(response.closing_question)]
            .filter(Boolean)
            .join("\n\n"));
        return chunks.length > 0
            ? chunks
            : ["I’m here. What are we working on?"];
    }

    if (response.type === "question") {
        pushChunk(chunks, [summary, clean(response.closing_question)]
            .filter(Boolean)
            .join("\n\n"));
        return chunks.length > 0
            ? chunks
            : ["What would you like me to look at?"];
    }

    // Keep the first message conversational: one clear thought, not a report header.
    pushChunk(chunks, [title ? `**${title}**` : "", summary]
        .filter(Boolean)
        .join("\n\n") || "Here’s what I found.");

    // Keep operational answers intentionally small. The schema already limits the
    // model to one section; this second guard keeps rendering resilient to callers.
    const usefulSections = response.sections
        .filter(section => section.bullets.some(Boolean))
        .slice(0, 1);

    for (const section of usefulSections) {
        const rendered = renderSection(section);
        if (rendered.length === 0) continue;
        pushChunk(chunks, rendered.join("\n"));
    }

    if (response.actions.length > 0) {
        const actionLines = response.actions
            .slice(0, 3)
            .map((action, index) => {
                const value = clean(action);
                return value ? `${index + 1}. ${value}` : "";
            })
            .filter(Boolean);

        if (actionLines.length > 0) {
            const heading = response.type === "recommendation"
                ? "**My recommendation**"
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
