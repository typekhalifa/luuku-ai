import { getActivities } from "./repository";

export function resolveActivities(

    company: string

) {

    return getActivities().filter(

        activity =>

            activity.company

                .toLowerCase()

                ===

            company.toLowerCase()

    );

}