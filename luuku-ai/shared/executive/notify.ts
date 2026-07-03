import { FounderNotification } from "./notifications";

export function notifyFounder(

    notifications: FounderNotification[]

) {

    if (notifications.length === 0) {

        return;

    }

    console.log("");

    console.log("========================================");

    console.log("      FOUNDER NOTIFICATIONS");

    console.log("========================================");

    for (const notification of notifications) {

        console.log("");

        console.log(`[${notification.level.toUpperCase()}]`);

        console.log(notification.title);

        console.log(notification.message);

    }

}