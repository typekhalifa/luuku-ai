export interface SimilarityMetric {

    readonly name: string;

    compare(
        source: number[],
        target: number[],
    ): number;

}