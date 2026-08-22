import { Activity } from "../../domain/activity";

import { activityRepository } from "../repositories/activity.repository";

export class ActivityService {

    async getActivities(): Promise<Activity[]> {

        return activityRepository.findAll();

    }

    async getCompanyActivities(

        companyId: string

    ): Promise<Activity[]> {

        return activityRepository.findByCompany(

            companyId

        );

    }

    async getIncompleteActivities(

        limit?: number

    ): Promise<Activity[]> {

        return activityRepository.findIncomplete(limit);

    }

    async markPrioritized(

        activity: Activity,
        actor = "Lex Executive AI"

    ): Promise<Activity> {

        const marker = `[LEX PRIORITY: HIGH] ${actor}`;
        const description = activity.description.startsWith(marker)
            ? activity.description
            : `${marker}\n${activity.description}`;

        return activityRepository.updateOutcome(
            activity.id,
            "Prioritized for follow-up by Lex Executive AI",
            description
        );

    }

    async createActivity(

        activity: Activity

    ): Promise<Activity> {

        return activityRepository.create(

            activity

        );

    }

}

export const activityService =
    new ActivityService();
