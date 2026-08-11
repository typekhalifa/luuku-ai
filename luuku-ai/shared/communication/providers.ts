import {
    communicationRouter
} from "./router";

import {
    resendEmailAdapter
} from "./resend-email-adapter";

let registered = false;

export function registerCommunicationProviders(): void {

    if (registered) {
        return;
    }

    communicationRouter.register(
        resendEmailAdapter
    );

    registered = true;
}

export function getCommunicationProviderStatus() {
    return {
        email: resendEmailAdapter.isAvailable()
            ? "available"
            : "unavailable"
    } as const;
}
