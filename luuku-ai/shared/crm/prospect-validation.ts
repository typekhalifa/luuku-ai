import OpenAI from "openai";
import { config } from "../config/env";
import { ProspectResearchResult } from "./web-research";

export interface ProspectValidation {
    opportunityConfidence: "HIGH" | "MEDIUM" | "LOW";
    concreteSignals: string[];
    unknowns: string[];
    validationQueries: string[];
    recommendedValidation: string;
}

const client = config.openaiApiKey
    ? new OpenAI({ apiKey: config.openaiApiKey })
    : null;

export async function validateProspectOpportunity(
    result: ProspectResearchResult,
): Promise<ProspectValidation> {
    const companyText = `${result.company.name} ${result.company.industry} ${result.summary}`;

    const queries = [
        `"${result.company.name}" workflow automation digital transformation operations`,
        `"${result.company.name}" internal systems processes reporting customer service`,
        `"${result.company.name}" technology transformation project workflow`,
    ];

    if (!client) {
        return {
            opportunityConfidence: "LOW",
            concreteSignals: [],
            unknowns: ["OpenAI is unavailable for targeted opportunity validation."],
            validationQueries: queries,
            recommendedValidation: `Research ${result.company.name}'s public operational and digital-transformation initiatives before outreach.`,
        };
    }

    const response = await client.responses.create({
        model: config.openaiModel,
        input: `
You are Luuku AI's prospect validation layer.

Assess whether the public research below provides concrete evidence for an AI workflow automation opportunity.
Do not invent internal pain points. Separate evidence from hypotheses.

Return JSON with exactly:
{
  "opportunityConfidence": "HIGH" | "MEDIUM" | "LOW",
  "concreteSignals": string[],
  "unknowns": string[],
  "recommendedValidation": string
}

Company context:
${companyText}

Current contact:
${result.contact.name}; ${result.contact.position ?? "unknown position"}; ${result.contact.department ?? "unknown department"}

Suggested targeted research queries:
${queries.map((query) => `- ${query}`).join("\n")}

Rules:
- A digital-transformation initiative is a signal, not proof of a workflow bottleneck.
- A contact in IT or digital transformation improves relevance but does not prove buying intent.
- Prefer specific public operational signals over generic sector assumptions.
- If evidence is weak, say LOW or MEDIUM.
- Never invent a project, pain point, budget, or buying intent.
`.trim(),
    });

    const raw = response.output_text?.trim() ?? "";

    try {
        const parsed = JSON.parse(raw) as ProspectValidation;
        return {
            opportunityConfidence: parsed.opportunityConfidence,
            concreteSignals: Array.isArray(parsed.concreteSignals) ? parsed.concreteSignals : [],
            unknowns: Array.isArray(parsed.unknowns) ? parsed.unknowns : [],
            validationQueries: queries,
            recommendedValidation: parsed.recommendedValidation || `Research ${result.company.name}'s public operational and digital-transformation initiatives before outreach.`,
        };
    } catch {
        return {
            opportunityConfidence: "LOW",
            concreteSignals: [],
            unknowns: ["The opportunity-validation response was not valid JSON."],
            validationQueries: queries,
            recommendedValidation: `Research ${result.company.name}'s public operational and digital-transformation initiatives before outreach.`,
        };
    }
}
