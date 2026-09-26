import { Activity } from "../../domain/activity";

import { activityRepository } from "../repositories/activity.repository";

export class ActivityService {
    async getActivities(companyId: string): Promise<Activity[]> {
        return activityRepository.findAll(companyId);
    }

    async getActivitiesSystem(): Promise<Activity[]> {
        return activityRepository.findAll();
    }

    async getCompanyActivities(companyId: string, requesterCompanyId: string): Promise<Activity[]> {
        if (companyId !== requesterCompanyId) {
            throw new Error("COMPANY_TENANT_MISMATCH");
        }
        return activityRepository.findByCompany(companyId);
    }

    async getCompanyActivitiesSystem(companyId: string): Promise<Activity[]> {
        return activityRepository.findByCompany(companyId);
    }

    async getIncompleteActivities(limit: number | undefined, companyId: string): Promise<Activity[]> {
        return activityRepository.findIncomplete(limit, companyId);
    }

    async getIncompleteActivitiesSystem(limit?: number): Promise<Activity[]> {
        return activityRepository.findIncomplete(limit);
    }

    async getOverdueActivities(limit: number | undefined, companyId: string): Promise<Activity[]> {
        return activityRepository.findOverdue(limit, companyId);
    }

    async getOverdueActivitiesSystem(limit?: number): Promise<Activity[]> {
        return activityRepository.findOverdue(limit);
    }

    async getActivitiesByIds(ids: string[], companyId: string): Promise<Activity[]> {
        return activityRepository.findByIds(ids, companyId);
    }

    async getActivitiesByIdsSystem(ids: string[]): Promise<Activity[]> {
        return activityRepository.findByIds(ids);
    }

    async markPrioritized(
        activity: Activity,
        actor = "Lex Executive AI",
        companyId: string
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

    async markPrioritizedSystem(
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

    async createActivity(activity: Activity, companyId: string): Promise<Activity> {
        return activityRepository.create(activity, companyId);
    }

    async createActivitySystem(activity: Activity): Promise<Activity> {
        return activityRepository.create(activity);
    }
}

export const activityService = new ActivityService();
