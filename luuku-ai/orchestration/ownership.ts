export type ExecutionOwnership =
    | { readonly scope: "COMPANY"; readonly companyId: string }
    | { readonly scope: "SYSTEM" };

export function assertValidExecutionOwnership(ownership: ExecutionOwnership): void {
    if (ownership.scope === "COMPANY" && ownership.companyId.trim() === "") {
        throw new Error("COMPANY execution ownership requires companyId.");
    }
}

export function ownershipMatches(
    left: ExecutionOwnership,
    right?: ExecutionOwnership,
): boolean {
    const normalizedRight = normalizeExecutionOwnership(right);
    if (left.scope !== normalizedRight.scope) return false;
    return left.scope === "SYSTEM" || (normalizedRight.scope === "COMPANY" && left.companyId === normalizedRight.companyId);
}

export function normalizeExecutionOwnership(ownership?: ExecutionOwnership): ExecutionOwnership {
    return ownership ?? { scope: "SYSTEM" };
}
