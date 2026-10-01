import {
    communicationRouter
} from "./router";

import {
    resendEmailAdapter
} from "./resend-email-adapter";

import {
    voiceAdapter
} from "./voice-adapter";

import {
    calendarAdapter
} from "./calendar-adapter";

import {
    discordRouterAdapter
} from "./discord-router-adapter";

let registered = false;

export function registerCommunicationProviders(): void {

    if (registered) {
        return;
    }

    communicationRouter.register(
        resendEmailAdapter
    );

    communicationRouter.register(
        voiceAdapter
    );

    communicationRouter.register(
        calendarAdapter
    );

    if (discordRouterAdapter.isAvailable()) {
        communicationRouter.register(
            discordRouterAdapter
        );
    }

    registered = true;
}

export function getCommunicationProviderStatus() {
    return {
        email: resendEmailAdapter.isAvailable()
            ? "available"
            : "unavailable",
        voice: voiceAdapter.isAvailable()
            ? "available"
            : "unavailable",
        calendar: calendarAdapter.isAvailable()
            ? "available"
            : "unavailable",
        discord: discordRouterAdapter.isAvailable()
            ? "available"
            : "unavailable"
    } as const;
}
