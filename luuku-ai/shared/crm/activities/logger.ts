import { Activity } from "./types";

import {

    saveActivity

} from "./repository";

export function logActivity(

    activity: Activity

): void {

    saveActivity(

        activity

    );

}