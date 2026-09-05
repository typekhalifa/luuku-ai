export interface CapabilityAliasMap {
    readonly [intentType: string]: string;
}

/** Explicit V8 objective-work capability aliases used when an intent has no direct mapping. */
export const V8_OBJECTIVE_CAPABILITY_ALIASES: CapabilityAliasMap = {
    INTERVENE_OBJECTIVE: "work.recover",
};
