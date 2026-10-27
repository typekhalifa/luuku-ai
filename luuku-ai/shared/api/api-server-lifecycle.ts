/**
 * Testable API listener lifecycle boundary.
 *
 * The executive host must initialize before listening. If shutdown is requested
 * while the listener is binding, the newly-bound listener is immediately closed
 * and startup reports that it did not become active.
 */
export interface ApiListenerHandle {
    close(): Promise<void>;
}

export interface ApiListenerLifecycleOptions {
    initialize(): Promise<void>;
    canStartListener(): boolean;
    listen(): Promise<ApiListenerHandle>;
    onStarted?(): void;
}

export async function startApiListener(
    options: ApiListenerLifecycleOptions,
): Promise<boolean> {
    await options.initialize();

    if (!options.canStartListener()) return false;

    const listener = await options.listen();

    // Shutdown can begin after the pre-listen check but before the OS finishes
    // binding the socket. Close the handle before returning in that race.
    if (!options.canStartListener()) {
        await listener.close();
        return false;
    }

    options.onStarted?.();
    return true;
}
