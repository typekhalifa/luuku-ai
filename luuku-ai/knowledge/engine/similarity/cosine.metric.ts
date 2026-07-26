import type {
    SimilarityMetric,
} from "./similarity.metric";

export class CosineSimilarityMetric
    implements SimilarityMetric {

    readonly name = "cosine";

    compare(
        source: number[],
        target: number[],
    ): number {

        if (source.length !== target.length) {

            throw new Error(
                "Vectors must have the same dimensions.",
            );

        }

        let dot = 0;

        let sourceMagnitude = 0;

        let targetMagnitude = 0;

        for (let i = 0; i < source.length; i++) {

            dot += source[i] * target[i];

            sourceMagnitude += source[i] * source[i];

            targetMagnitude += target[i] * target[i];

        }

        const denominator =
            Math.sqrt(sourceMagnitude)
            * Math.sqrt(targetMagnitude);

        if (denominator === 0) {

            return 0;

        }

        return dot / denominator;

    }

}

export const cosineSimilarityMetric =
    new CosineSimilarityMetric();