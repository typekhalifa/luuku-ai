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