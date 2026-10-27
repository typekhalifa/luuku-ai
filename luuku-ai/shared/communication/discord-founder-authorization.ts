/**
 * Fail-closed authorization for founder-facing Discord ingress.
 *
 * Configure LUUKU_DISCORD_FOUNDER_IDS as a comma-separated list of
 * immutable Discord user IDs. Display names are deliberately never accepted
 * as identity evidence.
 */
export function parseDiscordFounderAllowlist(value: string | undefined): ReadonlySet<string> {
    return new Set(
        (value ?? "")
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean),
    );
}

export type DiscordFounderAuthorization =
    | { allowed: true; reason: "founder-allowlisted" }
    | { allowed: false; reason: "founder-allowlist-not-configured" | "discord-user-not-allowlisted" | "discord-user-id-missing" };

export function authorizeDiscordFounder(
    authorId: string | undefined,
    allowlist: ReadonlySet<string>,
): DiscordFounderAuthorization {
    if (allowlist.size === 0) {
        return { allowed: false, reason: "founder-allowlist-not-configured" };
    }

    const normalizedId = authorId?.trim();
    if (!normalizedId) {
        return { allowed: false, reason: "discord-user-id-missing" };
    }

    if (!allowlist.has(normalizedId)) {
        return { allowed: false, reason: "discord-user-not-allowlisted" };
    }

    return { allowed: true, reason: "founder-allowlisted" };
}


export interface DiscordFounderMessageIdentity {
    authorId: string;
}

export async function handleAuthorizedDiscordMessage<T extends DiscordFounderMessageIdentity>(
    message: T,
    allowlist: ReadonlySet<string>,
    onAuthorized: (message: T) => Promise<void> | void,
    onRejected?: (reason: Extract<DiscordFounderAuthorization, { allowed: false }>["reason"], authorId: string) => void,
): Promise<boolean> {
    const authorization = authorizeDiscordFounder(message.authorId, allowlist);
    if (!authorization.allowed) {
        onRejected?.(authorization.reason, message.authorId || "(missing ID)");
        return false;
    }

    await onAuthorized(message);
    return true;
}
