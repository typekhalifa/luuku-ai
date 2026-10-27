export interface CleanupFailure {
    resource: string;
    error: unknown;
}

export async function runCleanupSequence(
    steps: ReadonlyArray<readonly [string, () => Promise<unknown>]>,
): Promise<CleanupFailure[]> {
    const failures: CleanupFailure[] = [];
    for (const [resource, cleanup] of steps) {
        try {
            await cleanup();
        } catch (error) {
            failures.push({ resource, error });
        }
    }
    return failures;
}
