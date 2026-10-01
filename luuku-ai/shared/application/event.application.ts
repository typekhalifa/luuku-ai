import { eventHistory } from "../events/history/event-history";

export class EventApplication {

    async getEvents(companyId?: string) {
        const events = eventHistory.getAll();

        if (!companyId) {
            return events;
        }

        return events.filter(
            (event) => event.context.companyId === companyId,
        );
    }

}

export const eventApplication =
    new EventApplication();
