import { buildExecutiveIntelligence } from "../../shared/executive/intelligence";

export interface ExecutiveContext {

    generatedAt: string;

    intelligence: ReturnType<
        typeof buildExecutiveIntelligence
    >;

}

export function buildExecutiveContext(): ExecutiveContext {

    return {

        generatedAt: new Date().toISOString(),

        intelligence:
            buildExecutiveIntelligence()

    };

}