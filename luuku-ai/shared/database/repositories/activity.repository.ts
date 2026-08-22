import { prisma } from "../client";

import { Activity } from "../../domain/activity";

import { ActivityMapper } from "../mappers/activity.mapper";

export class ActivityRepository {

    async findAll(): Promise<Activity[]> {

        const activities =
            await prisma.activity.findMany({

                orderBy: {

                    createdAt: "desc"

                }

            });

        return activities.map(

            ActivityMapper.toDomain

        );

    }

    async findByCompany(

        companyId: string

    ): Promise<Activity[]> {

        const activities =
            await prisma.activity.findMany({

                where: {

                    companyId

                },

                orderBy: {

                    createdAt: "desc"

                }

            });

        return activities.map(

            ActivityMapper.toDomain

        );

    }

    async findIncomplete(

        limit?: number

    ): Promise<Activity[]> {

        const activities =
            await prisma.activity.findMany({

                where: {
                    completed: false
                },

                orderBy: {
                    createdAt: "asc"
                },

                ...(limit ? { take: limit } : {})

            });

        return activities.map(
            ActivityMapper.toDomain
        );

    }

    async updateOutcome(

        id: string,
        outcome: string,
        description?: string

    ): Promise<Activity> {

        const updated =
            await prisma.activity.update({

                where: { id },

                data: {
                    outcome,
                    ...(description !== undefined ? { description } : {})
                }

            });

        return ActivityMapper.toDomain(
            updated
        );

    }

    async create(

        activity: Activity

    ): Promise<Activity> {

        const created =
            await prisma.activity.create({

                data:
                    ActivityMapper.toPersistence(

                        activity

                    )

            });

        return ActivityMapper.toDomain(

            created

        );

    }

}

export const activityRepository =
    new ActivityRepository();
