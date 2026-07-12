import { Activity } from "../../domain/activity";
import { Activity as PrismaActivity } from "@prisma/client";

export class ActivityMapper {

    static toDomain(
        activity: PrismaActivity
    ): Activity {

        return {

            id: activity.id,

            companyId: activity.companyId,

            contactId:
                activity.contactId ?? undefined,

            dealId:
                activity.dealId ?? undefined,

            type: activity.type,

            title: activity.title,

            description: activity.description,

            outcome:
                activity.outcome ?? undefined,

            createdBy: activity.createdBy,

            completed: activity.completed,

            createdAt:
                activity.createdAt.toISOString()

        };

    }

    static toPersistence(
        activity: Activity
    ) {

        return {

            id: activity.id,

            companyId: activity.companyId,

            contactId:
                activity.contactId ?? null,

            dealId:
                activity.dealId ?? null,

            type: activity.type,

            title: activity.title,

            description: activity.description,

            outcome:
                activity.outcome ?? null,

            createdBy:
                activity.createdBy,

            completed:
                activity.completed

        };

    }

}