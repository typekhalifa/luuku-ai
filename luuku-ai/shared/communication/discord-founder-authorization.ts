/**
 * Fail-closed authorization for founder-facing Discord ingress.
 *
 * Configure LUUKU_DISCORD_FOUNDER_USER_IDS as a comma-separated list of
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
