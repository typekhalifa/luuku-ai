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
            : "unavailable"
    } as const;
}
