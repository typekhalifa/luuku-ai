import { api } from "@/sdk/client";

import type { LuukuEvent } from "@/features/events";

export class EventClient {

    async getEvents(): Promise<LuukuEvent[]> {

        return api.get<LuukuEvent[]>("/events");

    }

}

export const eventClient =
    new EventClient();