import { CommunicationOwnership } from "./conversation";

export function ownershipKey(ownership: CommunicationOwnership): string {
    switch (ownership.scope) {
        case "COMPANY":
            return `company:${ownership.companyId}`;
        case "SPACE":
            return `space:${ownership.spaceId}`;
        case "SYSTEM":
            return "system";
    }
}

export function scopedThreadKey(
    ownership: CommunicationOwnership,
    threadKey: string,
): string {
    return `${ownershipKey(ownership)}:${threadKey}`;
}

export function assertValidOwnership(
    ownership: CommunicationOwnership,
): void {
    if (ownership.scope === "COMPANY" && !ownership.companyId.trim()) {
        throw new Error("COMMUNICATION_COMPANY_OWNERSHIP_ID_REQUIRED");
    }

    if (ownership.scope === "SPACE" && !ownership.spaceId.trim()) {
        throw new Error("COMMUNICATION_SPACE_OWNERSHIP_ID_REQUIRED");
    }
}

export function ownershipPersistence(
    ownership: CommunicationOwnership,
): {
    ownershipScope: CommunicationOwnership["scope"];
    companyId: string | null;
    spaceId: string | null;
} {
    assertValidOwnership(ownership);

    return {
        ownershipScope: ownership.scope,
        companyId: ownership.scope === "COMPANY" ? ownership.companyId : null,
        spaceId: ownership.scope === "SPACE" ? ownership.spaceId : null,
    };
}
