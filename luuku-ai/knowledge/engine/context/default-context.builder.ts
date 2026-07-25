import type { RetrievalResult } from "../types";

import type { ContextBuilder } from "./context-builder";

export class DefaultContextBuilder
    implements ContextBuilder {

    readonly name = "default";

    async build(
        results: RetrievalResult[]
    ): Promise<string> {

        return "";

    }

}

export const defaultContextBuilder =
    new DefaultContextBuilder();