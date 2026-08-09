export interface CollaborationRequest<T = unknown> {

    id: string;

    requester: string;

    target: string;

    subject: string;

    payload: T;

    createdAt: string;

}