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
    right: ExecutionOwnership,
): boolean {
    if (left.scope !== right.scope) return false;
    return left.scope === "SYSTEM" || left.companyId === right.companyId;
}
