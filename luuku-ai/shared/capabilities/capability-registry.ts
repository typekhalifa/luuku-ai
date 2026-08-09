import { Capability } from "./capability";

export interface CapabilityRegistry {

    register(
        capability: Capability
    ): void;

    find(
        name: string
    ): Capability | undefined;

    list(): Capability[];

}