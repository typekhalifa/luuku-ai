import { Company } from "../../domain/company";
import { Contact } from "../../domain/contact";
import { Deal } from "../../domain/deal";
import { Activity } from "../../domain/activity";

export interface WorkflowContext {

    workflowId: string;

    startedAt: Date;

    completedAt?: Date;

    durationMs?: number;

    company?: Company;

    contact?: Contact;

    deal?: Deal;

    activity?: Activity;

}