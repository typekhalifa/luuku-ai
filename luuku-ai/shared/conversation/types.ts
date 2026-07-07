export interface ConversationStage {

    title: string;

    objective: string;

    expectedOutcome: string;

}

export interface ConversationPlan {

    strategy: string;

    stages: ConversationStage[];

}