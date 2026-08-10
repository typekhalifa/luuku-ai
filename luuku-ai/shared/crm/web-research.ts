import OpenAI from "openai";

export interface ProspectResearchResult {
    company: {
        name: string;
        industry: string;
        website?: string;
        country: string;
        city?: string;
        size?: "startup" | "small" | "medium" | "enterprise";
        confidence: number;
        source: string;
    };
    contact: {
        name: string;
        email?: string;
        phoneNumber?: string;
        preferredLanguage: string;
        department?: string;
        position?: string;
        confidence: number;
        source: string;
    };
    sources: Array<{
        title: string;
        url: string;
    }>;
    summary: string;
}

const client = new OpenAI();

function parseResearchResponse(text: string): ProspectResearchResult {
    const parsed = JSON.parse(text) as {
        company: {
            name: string;
            industry: string;
            website: string | null;
            country: string;
            city: string | null;
            size: "startup" | "small" | "medium" | "enterprise" | null;
            confidence: number;
            source: string;
        };
        contact: {
            name: string;
            email: string | null;
            phoneNumber: string | null;
            preferredLanguage: string;
            department: string | null;
            position: string | null;
            confidence: number;
            source: string;
        };
        sources: Array<{
            title: string;
            url: string;
        }>;
        summary: string;
    };

    if (!parsed.company?.name || !parsed.company?.source) {
        throw new Error("Research Agent returned an incomplete company result");
    }

    if (!parsed.contact?.name || !parsed.contact?.source) {
        throw new Error("Research Agent returned an incomplete contact result");
    }

    if (!Array.isArray(parsed.sources) || parsed.sources.length === 0) {
        throw new Error("Research Agent returned no verifiable sources");
    }

    for (const source of parsed.sources) {
        if (!source.title || !source.url) {
            throw new Error("Research Agent returned an invalid source");
        }
    }

    return {
        company: {
            name: parsed.company.name,
            industry: parsed.company.industry,
            website: parsed.company.website ?? undefined,
            country: parsed.company.country,
            city: parsed.company.city ?? undefined,
            size: parsed.company.size ?? undefined,
            confidence: parsed.company.confidence,
            source: parsed.company.source,
        },
        contact: {
            name: parsed.contact.name,
            email: parsed.contact.email ?? undefined,
            phoneNumber: parsed.contact.phoneNumber ?? undefined,
            preferredLanguage: parsed.contact.preferredLanguage,
            department: parsed.contact.department ?? undefined,
            position: parsed.contact.position ?? undefined,
            confidence: parsed.contact.confidence,
            source: parsed.contact.source,
        },
        sources: parsed.sources,
        summary: parsed.summary,
    };
}

export async function researchProspect(
    company: string,
    reasons: string[],
): Promise<ProspectResearchResult> {
    const model =
        process.env.OPENAI_RESEARCH_MODEL ??
        process.env.OPENAI_MODEL ??
        "gpt-5-mini";

    const prompt = `
You are Luuku AI's Research Agent.

Research this real organization for CRM enrichment:
Company: ${company}
Reasons:
${reasons.map((reason) => `- ${reason}`).join("\n")}

Use web search. Prefer official organization websites and official government or institutional sources. Use secondary sources only when necessary.

CRITICAL DATA RULES:
1. Never invent an email address, phone number, person, job title, website, or other contact detail.
2. Only return a contact detail when the searched sources support it.
3. If a contact detail cannot be verified, return null for that field.
4. The contact may be a verified department/office rather than a named person when that is what the sources support.
5. Every source URL must be a real URL returned or opened during web research.
6. Confidence is 0-100 and must reflect evidence quality, not certainty from the model alone.
7. Return the requested structured JSON. Do not add commentary outside it.

For contact.name, use a verified person's name when available. If no named person can be verified, use the verified department or office name instead.
`;

    const response = await client.responses.create({
        model,
        tools: [{ type: "web_search" }],
        input: prompt,
        text: {
            format: {
                type: "json_schema",
                name: "prospect_research",
                strict: true,
                schema: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                        company: {
                            type: "object",
                            additionalProperties: false,
                            properties: {
                                name: { type: "string" },
                                industry: { type: "string" },
                                website: { type: ["string", "null"] },
                                country: { type: "string" },
                                city: { type: ["string", "null"] },
                                size: {
                                    type: [
                                        "string",
                                        "null",
                                    ],
                                    enum: [
                                        "startup",
                                        "small",
                                        "medium",
                                        "enterprise",
                                        null,
                                    ],
                                },
                                confidence: { type: "number" },
                                source: { type: "string" },
                            },
                            required: [
                                "name",
                                "industry",
                                "website",
                                "country",
                                "city",
                                "size",
                                "confidence",
                                "source",
                            ],
                        },
                        contact: {
                            type: "object",
                            additionalProperties: false,
                            properties: {
                                name: { type: "string" },
                                email: { type: ["string", "null"] },
                                phoneNumber: {
                                    type: ["string", "null"],
                                },
                                preferredLanguage: { type: "string" },
                                department: {
                                    type: ["string", "null"],
                                },
                                position: {
                                    type: ["string", "null"],
                                },
                                confidence: { type: "number" },
                                source: { type: "string" },
                            },
                            required: [
                                "name",
                                "email",
                                "phoneNumber",
                                "preferredLanguage",
                                "department",
                                "position",
                                "confidence",
                                "source",
                            ],
                        },
                        sources: {
                            type: "array",
                            items: {
                                type: "object",
                                additionalProperties: false,
                                properties: {
                                    title: { type: "string" },
                                    url: { type: "string" },
                                },
                                required: ["title", "url"],
                            },
                        },
                        summary: { type: "string" },
                    },
                    required: ["company", "contact", "sources", "summary"],
                },
            },
        },
    });

    return parseResearchResponse(response.output_text);
}
