import { Activity } from "./types";
import { loadCollection, saveCollection } from "../persistent-store";

let activities: Activity[] = loadCollection<Activity>("activities");

export function getActivities(): Activity[] {
    activities = loadCollection<Activity>("activities");
    return activities;
}

export function saveActivity(activity: Activity): void {
    activities = [...getActivities(), activity];
    saveCollection("activities", activities);
}
