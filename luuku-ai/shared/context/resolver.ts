import { AgentTask } from "../agents/interface";
import { companyService } from "../database/services/company.service";

export interface TaskContext {

    companyName: string;

    contactType: string;

}

export async function resolveTaskContext(

    task: AgentTask

): Promise<TaskContext> {

    const text =

        `${task.title} ${task.description}`;

    const company =
        await resolveCompany(text);

    return {

        companyName: company,

        contactType: "General"

    };

}

async function resolveCompany(

    text: string

): Promise<string> {

    const lower = text.toLowerCase();

    // Known abbreviations remain deterministic for recurring executive tasks.
    if (lower.includes("rra")) {

        return "Rwanda Revenue Authority";

    }

    if (lower.includes("bk")) {

        return "Bank of Kigali";

    }

    // PostgreSQL is the source of truth for company resolution.
    const companies =
        await companyService.getCompanies();

    // Prefer the longest company name so overlapping names resolve correctly.
    const ordered = [...companies]
        .sort((a, b) => b.name.length - a.name.length);

    for (const company of ordered) {

        if (
            lower.includes(
                company.name.toLowerCase()
            )
        ) {

            return company.name;

        }

    }

    // Fallback extraction for phrases such as:
    // "Follow up: Rwanda Revenue Authority"
    // "Follow up: Luuku Email Test by email"
    const patterns = [

        /follow[\s-]?up[:\s]+(.+?)(?=\s+by\s+(?:email|e-mail|call|phone|voice|meeting)\b|$)/i,

        /call[:\s]+(.+?)(?=\s+by\s+(?:email|e-mail|call|phone|voice|meeting)\b|$)/i,

        /meeting[:\s]+(.+?)(?=\s+by\s+(?:email|e-mail|call|phone|voice|meeting)\b|$)/i,

        /contact[:\s]+(.+?)(?=\s+by\s+(?:email|e-mail|call|phone|voice|meeting)\b|$)/i

    ];

    for (const pattern of patterns) {

        const match = text.match(pattern);

        if (match) {

            return match[1].trim();

        }

    }

    return "Unknown";

}
