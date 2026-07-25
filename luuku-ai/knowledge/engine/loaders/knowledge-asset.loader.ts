import type { KnowledgeDocument } from "../types";
import type { KnowledgeLoader } from "./base.loader";

export class KnowledgeAssetLoader
    implements KnowledgeLoader {

    readonly name = "knowledge-assets";

    async load(): Promise<KnowledgeDocument[]> {

        /**
         * Future:
         *
         * industries/
         * offers/
         * playbooks/
         * prompts/
         * prospects/
         * templates/
         */

        return [];

    }

}

export const knowledgeAssetLoader =
    new KnowledgeAssetLoader();