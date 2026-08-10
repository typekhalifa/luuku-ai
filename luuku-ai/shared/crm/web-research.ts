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
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start < 0 || end <= start) {
        throw new Error("Research Agent returned no JSON research result");
    }

    const parsed = JSON.parse(text.slice(start, end + 1)) as ProspectResearchResult;

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

    return parsed;
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
3. If a contact detail cannot be verified, omit it.
4. The contact may be a verified department/office rather than a named person when that is what the sources support.
5. Every source URL must be a real URL returned or opened during web research.
6. Confidence is 0-100 and must reflect evidence quality, not certainty from the model alone.
7. Return JSON only. No markdown and no commentary.

Return exactly this shape:
{
  "company": {
    "name": "string",
    "industry": "string",
    "website": "string or omit",
    "country": "string",
    "city": "string or omit",
    "size": "startup|small|medium|enterprise or omit",
    "confidence": 0,
    "source": "string"
  },
  "contact": {
    "name": "string",
    "email": "string or omit",
    "phoneNumber": "string or omit",
    "preferredLanguage": "string",
    "department": "string or omit",
    "position": "string or omit",
    "confidence": 0,
    "source": "string"
  },
  "sources": [
    { "title": "string", "url": "https://..." }
  ],
  "summary": "string"
}
`;

    const response = await client.responses.create({
        model,
        tools: [{ type: "web_search" }],
        input: prompt,
    });

    return parseResearchResponse(response.output_text);
}
