export interface CollaborationEvent<T = unknown> {

    id: string;

    type: string;

    source: string;

    payload: T;

    createdAt: string;

}