import { Activity } from "../../domain/activity";

import { activityRepository } from "../repositories/activity.repository";

export class ActivityService {
    async getActivities(companyId?: string): Promise<Activity[]> {
        return activityRepository.findAll(companyId);
    }

    async getCompanyActivities(companyId: string): Promise<Activity[]> {
        return activityRepository.findByCompany(companyId);
    }

    async getIncompleteActivities(limit?: number, companyId?: string): Promise<Activity[]> {
        return activityRepository.findIncomplete(limit, companyId);
    }

    async getOverdueActivities(limit?: number, companyId?: string): Promise<Activity[]> {
        return activityRepository.findOverdue(limit, companyId);
    }

    async getActivitiesByIds(ids: string[], companyId?: string): Promise<Activity[]> {
        return activityRepository.findByIds(ids, companyId);
    }

    async markPrioritized(
        activity: Activity,
        actor = "Lex Executive AI",
        companyId?: string
    ): Promise<Activity> {
        const marker = `[LEX PRIORITY: HIGH] ${actor}`;
        const description = activity.description.startsWith(marker)
            ? activity.description
            : `${marker}\n${activity.description}`;

        return activityRepository.updateOutcome(
            activity.id,
            "Prioritized for follow-up by Lex Executive AI",
            description,
            companyId
        );
    }

    async createActivity(activity: Activity, companyId?: string): Promise<Activity> {
        return activityRepository.create(activity, companyId);
    }
}

export const activityService = new ActivityService();
