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
        await resolveCompany(text, companyId);

    return {

        companyName: company,

        contactType: "General"

    };

}

async function resolveCompany(

    text: string

): Promise<string> {

    const lower = text.toLowerCase();

    if (lower.includes(company.name.toLowerCase())) {
        return company.name;
    }

    return company.name;



}
