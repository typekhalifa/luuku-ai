import { getActivities } from "../activities/repository";

import { TimelineEntry } from "./types";

export function buildTimeline(): TimelineEntry[] {

    return getActivities()

        .map(activity => ({

            id:

                activity.id,

            timestamp:

                activity.createdAt,

            company:

                activity.company,

            contact:

                activity.contact,

            type:

                activity.type,

            title:

                activity.title,

            description:

                activity.description,

            createdBy:

                activity.createdBy

        }))

        .sort(

            (a, b) =>

                new Date(b.timestamp).getTime()

                -

                new Date(a.timestamp).getTime()

        );

}