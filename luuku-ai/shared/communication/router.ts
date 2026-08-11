import {
    CommunicationAdapter,
    CommunicationCapability,
    CommunicationExecutionResult,
    CommunicationRequest
} from "./types";

export class CommunicationRouter {

    private readonly adapters =
        new Map<CommunicationCapability, CommunicationAdapter>();

    register(
        adapter: CommunicationAdapter
    ): void {

        this.adapters.set(
            adapter.capability,
            adapter
        );

    }

    hasCapability(
        capability: CommunicationCapability
    ): boolean {

        const adapter =
            this.adapters.get(capability);

        return Boolean(
            adapter?.isAvailable()
        );

    }

    listCapabilities(): CommunicationCapability[] {

        return Array.from(
            this.adapters.entries()
        )
            .filter(([, adapter]) =>
                adapter.isAvailable()
            )
            .map(([capability]) =>
                capability
            );

    }

    async execute(
        request: CommunicationRequest
    ): Promise<CommunicationExecutionResult> {

        const adapter =
            this.adapters.get(
                request.capability
            );

        if (!adapter) {

            return {
                capability: request.capability,
                channel: request.channel,
                status: "blocked",
                executed: false,
                verified: false,
                summary:
                    `Communication capability ${request.capability} is not registered.`,
                error:
                    "CAPABILITY_NOT_REGISTERED"
            };

        }

        if (!adapter.isAvailable()) {

            return {
                capability: request.capability,
                channel: request.channel,
                status: "blocked",
                executed: false,
                verified: false,
                summary:
                    `Communication capability ${request.capability} is registered but currently unavailable.`,
                error:
                    "CAPABILITY_UNAVAILABLE"
            };

        }

        return adapter.execute(request);

    }

}

export const communicationRouter =
    new CommunicationRouter();
