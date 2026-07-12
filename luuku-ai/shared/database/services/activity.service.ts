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