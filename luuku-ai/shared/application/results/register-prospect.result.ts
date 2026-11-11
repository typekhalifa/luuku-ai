import { Company } from "../../domain/company";
import { Contact } from "../../domain/contact";
import { Deal } from "../../domain/deal";
import { Activity } from "../../domain/activity";
import type { ResearchedProspect } from "../../domain/prospect";

export interface RegisterProspectResult {

    success: boolean;

    message: string;

    workflowId: string;

    startedAt: string;

    completedAt: string;

    durationMs: number;

    company: Company;

    contact: Contact;

    deal: Deal;

    activity: Activity;

    prospect?: ResearchedProspect;

}