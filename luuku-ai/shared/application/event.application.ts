import { eventHistory } from "../events/history/event-history";

export class EventApplication {

    async getEvents() {

        return eventHistory.getAll();

    }

}

export const eventApplication =
    new EventApplication();