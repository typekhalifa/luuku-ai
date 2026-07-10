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

        `${task.title} ${task.description}`.toLowerCase();

    const company =

        findCompany(text);

    return {

        companyName:

            company ?? "Unknown",

        contactType:

            "General"

    };

}

function findCompany(

    text: string

): string | undefined {

    const companies =

        getCRMCompanies();

    for (const company of companies) {

        if (

            text.includes(

                company.name.toLowerCase()

            )

        ) {

            return company.name;

        }

    }

    // Temporary support for common abbreviations
    // until Company.aliases is added in v1.4.0.

    if (text.includes("rra")) {

        return "Rwanda Revenue Authority";

    }

    if (text.includes("bk")) {

        return "Bank of Kigali";

    }

    if (text.includes("mtn")) {

        return "MTN Rwanda";

    }

    if (text.includes("airtel")) {

        return "Airtel Rwanda";

    }

    return undefined;

}