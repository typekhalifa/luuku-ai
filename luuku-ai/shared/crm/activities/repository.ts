import { Activity } from "./types";

const activities: Activity[] = [];

export function getActivities(): Activity[] {

    return activities;

}

export function saveActivity(

    activity: Activity

): void {

    activities.push(

        activity

    );

}