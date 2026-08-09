import { Capability } from "./capability";

import { CapabilityRegistry } from "./capability-registry";

export class InMemoryCapabilityRegistry
    implements CapabilityRegistry {

    private readonly capabilities =
        new Map<string, Capability>();

    register(
        capability: Capability
    ): void {

        this.capabilities.set(
            capability.name,
            capability
        );

    }

    find(
        name: string
    ): Capability | undefined {

        return this.capabilities.get(name);

    }

    list(): Capability[] {

        return [
            ...this.capabilities.values()
        ];

    }

}