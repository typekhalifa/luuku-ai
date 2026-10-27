/**
 * Coordinates the narrow race between asynchronous startup and process shutdown.
 * It deliberately does not own resources; the API entry point remains responsible
 * for cleanup and for keeping V6 as the execution authority.
 */
export class ApiLifecycleGate {
    private shutdownRequested = false;

    requestShutdown(): void {
        this.shutdownRequested = true;
    }

    canStartListener(): boolean {
        return !this.shutdownRequested;
    }

    isShutdownRequested(): boolean {
        return this.shutdownRequested;
    }
}
