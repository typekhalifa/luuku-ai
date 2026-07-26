import type {
    RetrievalResult,
} from "../types";

import type {
    ContextBuilder,
} from "./context-builder";

export class DefaultContextBuilder
    implements ContextBuilder {

    readonly name = "default";

    async build(
        results: RetrievalResult[],
    ): Promise<string> {

        if (results.length === 0) {

            return "";

        }

        const sections =
            results.map(

                (result, index) => {

                    return [

                        `### Context ${index + 1}`,

                        `Score: ${result.score.toFixed(4)}`,

                        "",

                        result.chunk.content,

                    ].join("\n");

                },

            );

        return [

            "====================",

            "RETRIEVED CONTEXT",

            "====================",

            "",

            ...sections,

        ].join("\n");

    }

}

export const defaultContextBuilder =
    new DefaultContextBuilder();