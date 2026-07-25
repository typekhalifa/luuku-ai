import type {

    KnowledgeChunk,

} from "./chunk";

export interface RetrievalResult {

    chunk: KnowledgeChunk;

    score: number;

}