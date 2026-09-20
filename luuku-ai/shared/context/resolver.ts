import { AgentTask } from "../agents/interface";
import { companyService } from "../database/services/company.service";

export interface TaskContext {
    companyName: string;
    contactType: string;
}

export async function resolveTaskContext(
    task: AgentTask,
    companyId: string,
): Promise<TaskContext> {
    const company = await companyService.getCompany(companyId, companyId);
    if (!company) throw new Error("COMPANY_NOT_FOUND_OR_UNAUTHORIZED");

    return {
        companyName: company.name,
        contactType: "General",
    };
}
