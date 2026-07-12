import { AgentTask } from "../agents/interface";
import { getCRMCompanies } from "../crm/company-repository";

export interface TaskContext {

    companyName: string;

    contactType: string;

}

export function resolveTaskContext(

    task: AgentTask

): TaskContext {

    const text =

        `${task.title} ${task.description}`;

    const company =

        resolveCompany(text);

    return {

        companyName: company,

        contactType: "General"

    };

}

function resolveCompany(

    text: string

): string {

    const lower = text.toLowerCase();

    // Known abbreviations
    if (lower.includes("rra")) {

        return "Rwanda Revenue Authority";

    }

    if (lower.includes("bk")) {

        return "Bank of Kigali";

    }

    // Match against CRM companies by full name
    for (const company of getCRMCompanies()) {

        if (

            lower.includes(

                company.name.toLowerCase()

            )

        ) {

            return company.name;

        }

    }

    // Fallback extraction for phrases like:
    // "Follow up: Rwanda Revenue Authority"
    // "Call Rwanda Revenue Authority"
    const patterns = [

        /follow[\s-]?up[:\s]+(.+)/i,

        /call[:\s]+(.+)/i,

        /meeting[:\s]+(.+)/i,

        /contact[:\s]+(.+)/i

    ];

    for (const pattern of patterns) {

        const match = text.match(pattern);

        if (match) {

            return match[1].trim();

        }

    }

    return "Unknown";

}