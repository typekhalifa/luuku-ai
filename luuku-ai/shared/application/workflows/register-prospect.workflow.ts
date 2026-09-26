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

        request: RegisterProspectRequest,
        companyId: string

    ): Promise<RegisterProspectResult> {

        const context =
            createWorkflowContext();

        const companyCreated =
            await this.ensureCompany(
                context,
                request.company,
                companyId
            );

        await this.ensurePrimaryContact(
            context,
            request.contact,
            companyId
        );

        await this.ensureInitialDeal(
            context,
            companyId
        );

        await this.logInitialActivity(
            context,
            companyId
        );

        completeWorkflow(
            context
        );

        if (companyCreated) {

            await eventBus.publish(

                new ProspectRegisteredEvent(

                    {

                        workflowId:
                            context.workflowId,

                        agent:
                            "research-agent",

                        correlationId:
                            context.workflowId

                    },

                    context.company!.id,

                    context.company!.name,

                    context.contact!.id,

                    context.deal!.id

                )

            );

        }

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

        company: RegisterProspectRequest["company"],
        companyId: string

    ): Promise<boolean> {

        const existing =
            await companyService.getCompany(
                companyId,
                companyId
            );

        if (!existing) {
            throw new Error("COMPANY_NOT_FOUND_OR_UNAUTHORIZED");
        }

        context.company = existing;

        return false;

    }

    private async ensurePrimaryContact(

        context: WorkflowContext,

        contact: RegisterProspectRequest["contact"],
        companyId: string

    ): Promise<void> {

        const existingContacts =
            await contactService.getCompanyContacts(
                context.company!.id,
                companyId
            );

        const normalizedEmail =
            contact.email?.trim().toLowerCase();

        const normalizedPhone =
            contact.phoneNumber?.trim();

        const existing =
            existingContacts.find(
                candidate =>
                    (
                        !!normalizedEmail &&
                        candidate.email?.trim().toLowerCase() ===
                            normalizedEmail
                    ) ||
                    (
                        !!normalizedPhone &&
                        candidate.phoneNumber?.trim() ===
                            normalizedPhone
                    )
            );

        const now =
            new Date().toISOString();

        if (existing) {

            context.contact =
                await contactService.updateContact({

                    ...existing,

                    name:
                        contact.name,

                    email:
                        contact.email,

                    phoneNumber:
                        contact.phoneNumber,

                    preferredLanguage:
                        contact.preferredLanguage,

                    department:
                        contact.department,

                    position:
                        contact.position,

                    verified:
                        contact.verified,

                    confidence:
                        contact.confidence,

                    source:
                        contact.source,

                    lastVerifiedAt:
                        contact.lastVerifiedAt,

                    updatedAt:
                        now

                }, context.company!.id);

            return;

        }

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

            }, context.company!.id);

    }

    private async ensureInitialDeal(

        context: WorkflowContext,
        companyId: string

    ): Promise<void> {

        const existingDeals =
            await dealService.getCompanyDeals(
                context.company!.id,
                companyId
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

            }, context.company!.id);

    }

    private async logInitialActivity(

        context: WorkflowContext,
        companyId?: string

    ): Promise<void> {

        const existingActivities =
            await activityService.getCompanyActivities(
                context.company!.id,
                companyId
            );

        const existingRegistration =
            existingActivities.find(
                activity =>
                    activity.title ===
                        "Prospect Registered" &&
                    activity.dealId ===
                        context.deal!.id
            );

        if (existingRegistration) {

            context.activity =
                existingRegistration;

            return;

        }

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

            }, context.company!.id);

    }

}

export const registerProspectWorkflow =
    new RegisterProspectWorkflow();