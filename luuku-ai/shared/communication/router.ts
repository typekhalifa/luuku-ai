import {
    CommunicationAdapter,
    CommunicationCapability,
    CommunicationExecutionResult,
    CommunicationRequest
} from "./types";

import {
    communicationPolicy
} from "./communication-policy";

import {
    communicationExecutionService
} from "./communication-execution.service";

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

        const policy =
            await communicationPolicy.evaluate(request);

        const execution =
            await communicationExecutionService.start(
                request,
                policy
            );

        if (execution.existingResult) {
            return execution.existingResult;
        }

        if (policy.decision !== "allow") {
            const result: CommunicationExecutionResult = {
                capability: request.capability,
                channel: request.channel,
                status: "blocked",
                executed: false,
                verified: false,
                summary: policy.reason,
                error: policy.errorCode,
            };

            await communicationExecutionService.complete(
                execution.id,
                result
            );

            return result;
        }

        const adapter =
            this.adapters.get(
                request.capability
            );

        if (!adapter) {

            const result: CommunicationExecutionResult = {
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

            await communicationExecutionService.complete(
                execution.id,
                result
            );

            return result;

        }

        if (!adapter.isAvailable()) {

            const result: CommunicationExecutionResult = {
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

            await communicationExecutionService.complete(
                execution.id,
                result
            );

            return result;

        }

        await communicationExecutionService.markExecuting(
            execution.id
        );

        try {
            const result =
                await adapter.execute(request);

            await communicationExecutionService.complete(
                execution.id,
                result
            );

            return result;
        } catch (error) {
            const result: CommunicationExecutionResult = {
                capability: request.capability,
                channel: request.channel,
                status: "failed",
                executed: false,
                verified: false,
                summary:
                    "Communication adapter execution failed before completion.",
                error:
                    error instanceof Error
                        ? error.message
                        : String(error),
            };

            await communicationExecutionService.complete(
                execution.id,
                result
            );

            return result;
        }

    }

}

export const communicationRouter =
    new CommunicationRouter();
