import { Activity } from "./types";

import { getActivities } from "./repository";

export function updateActivity(

    activity: Activity

): void {

    const activities = getActivities();

    const index = activities.findIndex(

        item =>

            item.id === activity.id

    );

    if (index >= 0) {

        activities[index] = activity;

        return;

    }

    activities.push(activity);

}