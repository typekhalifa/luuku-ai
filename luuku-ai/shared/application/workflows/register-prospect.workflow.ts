import crypto from "crypto";

import { Company } from "../../domain/company";
import { Contact } from "../../domain/contact";
import { Deal } from "../../domain/deal";
import { Activity } from "../../domain/activity";

import { companyService } from "../../database/services/company.service";
import { contactService } from "../../database/services/contact.service";
import { dealService } from "../../database/services/deal.service";
import { activityService } from "../../database/services/activity.service";

import { RegisterProspectResult } from "../results/register-prospect.result";

import {
    WorkflowContext,
    createWorkflowContext,
    completeWorkflow
} from "./";

import { eventBus } from "../../events/core/event-bus";

import { ProspectRegisteredEvent } from "../../events/events/prospect-registered.event";
export interface RegisterProspectRequest {

    company: Omit<
        Company,
        "id" | "createdAt" | "updatedAt"
    >;

    contact: Omit<
        Contact,
        "id" |
        "companyId" |
        "createdAt" |
        "updatedAt"
    >;

}

export class RegisterProspectWorkflow {

    async execute(

        request: RegisterProspectRequest

    ): Promise<RegisterProspectResult> {

        const context =
            createWorkflowContext();

        await this.ensureCompany(

            context,

            request.company

        );

        await this.ensurePrimaryContact(

            context,

            request.contact

        );

        await this.ensureInitialDeal(

            context

        );

        await this.logInitialActivity(

            context

        );

        completeWorkflow(

            context

        );

        await eventBus.publish(

            new ProspectRegisteredEvent(

                context.workflowId,

                context.company!.id,

                context.company!.name,

                context.contact!.id,

                context.deal!.id

            )

        );

        return {

            success: true,

            message:
                "Prospect registered successfully.",

            workflowId:
                context.workflowId,

            startedAt:
                context.startedAt.toISOString(),

            completedAt:
                context.completedAt!.toISOString(),

            durationMs:
                context.durationMs!,

            company:
                context.company!,

            contact:
                context.contact!,

            deal:
                context.deal!,

            activity:
                context.activity!

        };

    }

    private async ensureCompany(

        context: WorkflowContext,

        company: RegisterProspectRequest["company"]

    ): Promise<void> {

        const existing =

            await companyService.findCompany(

                company.name

            );

        if (existing) {

            context.company = existing;

            return;

        }

        const now =
            new Date().toISOString();

        context.company =

            await companyService.createCompany({

                ...company,

                id:
                    crypto.randomUUID(),

                createdAt:
                    now,

                updatedAt:
                    now

            });

    }

    private async ensurePrimaryContact(

        context: WorkflowContext,

        contact: RegisterProspectRequest["contact"]

    ): Promise<void> {

        const now =
            new Date().toISOString();

        context.contact =

            await contactService.createContact({

                ...contact,

                id:
                    crypto.randomUUID(),

                companyId:
                    context.company!.id,

                createdAt:
                    now,

                updatedAt:
                    now

            });

    }

    private async ensureInitialDeal(

        context: WorkflowContext

    ): Promise<void> {

        const existingDeals =

            await dealService.getCompanyDeals(

                context.company!.id

            );

        if (existingDeals.length > 0) {

            context.deal =
                existingDeals[0];

            return;

        }

        const now =
            new Date().toISOString();

        context.deal =

            await dealService.createDeal({

                id:
                    crypto.randomUUID(),

                companyId:
                    context.company!.id,

                title:
                    "Initial Opportunity",

                value:
                    0,

                currency:
                    "USD",

                stage:
                    "lead",

                probability:
                    10,

                ownerAgentId:
                    "research-agent",

                nextAction:
                    "Executive Review",

                dueDate:
                    undefined,

                createdAt:
                    now,

                updatedAt:
                    now

            });

    }

    private async logInitialActivity(

        context: WorkflowContext

    ): Promise<void> {

        context.activity =

            await activityService.createActivity({

                id:
                    crypto.randomUUID(),

                companyId:
                    context.company!.id,

                contactId:
                    context.contact!.id,

                dealId:
                    context.deal!.id,

                type:
                    "note",

                title:
                    "Prospect Registered",

                description:
                    "Prospect registered by Research Agent.",

                outcome:
                    "Company added to CRM.",

                createdBy:
                    "research-agent",

                completed:
                    true,

                createdAt:
                    new Date().toISOString()

            });

    }

}

export const registerProspectWorkflow =
    new RegisterProspectWorkflow();