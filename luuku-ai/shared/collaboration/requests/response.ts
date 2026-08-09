export interface CollaborationResponse<T = unknown> {

    requestId: string;

    responder: string;

    success: boolean;

    payload: T;

    completedAt: string;

}