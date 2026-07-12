import { Deal } from "../../domain/deal";
import { Deal as PrismaDeal } from "@prisma/client";

export class DealMapper {

    static toDomain(
        deal: PrismaDeal
    ): Deal {

        return {

            id: deal.id,

            companyId: deal.companyId,

            title: deal.title,

            value: deal.value,

            currency: deal.currency,

            stage: deal.stage,

            probability: deal.probability,

            ownerAgentId: deal.ownerAgentId,

            nextAction: deal.nextAction,

            dueDate:
                deal.dueDate?.toISOString(),

            expectedCloseDate:
                deal.expectedCloseDate?.toISOString(),

            lastActivityAt:
                deal.lastActivityAt?.toISOString(),

            createdAt:
                deal.createdAt.toISOString(),

            updatedAt:
                deal.updatedAt.toISOString()

        };

    }

    static toPersistence(
        deal: Deal
    ) {

        return {

            id: deal.id,

            companyId: deal.companyId,

            title: deal.title,

            value: deal.value,

            currency: deal.currency,

            stage: deal.stage,

            probability: deal.probability,

            ownerAgentId: deal.ownerAgentId,

            nextAction: deal.nextAction,

            dueDate:
                deal.dueDate
                    ? new Date(deal.dueDate)
                    : null,

            expectedCloseDate:
                deal.expectedCloseDate
                    ? new Date(
                        deal.expectedCloseDate
                    )
                    : null,

            lastActivityAt:
                deal.lastActivityAt
                    ? new Date(
                        deal.lastActivityAt
                    )
                    : null

        };

    }

}