import { eventHistory } from "./event-history";

export function printEventHistory(): void {

    console.log("");

    console.log("======================================");
    console.log(" EVENT HISTORY");
    console.log("======================================");
    console.log("");

    const history = eventHistory.getAll();

    history.forEach(

        (event, index) => {

            console.log(

                `${index + 1}. ${event.type}`

            );

            console.log(

                `   ${event.occurredAt}`

            );

            console.log("");

        }

    );

}