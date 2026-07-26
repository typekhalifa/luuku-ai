import type {
    RetrievalResult,
} from "../types";

export interface ContextBuilder {

    readonly name: string;

    build(
        results: RetrievalResult[],
    ): Promise<string>;

}