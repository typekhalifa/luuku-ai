export interface BusinessObjective {

    title: string;

    description: string;

    desiredOutcome: string;

    successCriteria: string[];

}

export const DiscoveryMeetingObjective: BusinessObjective = {

    title: "Discovery Meeting",

    description:

        "Schedule an introductory discovery meeting with the prospect.",

    desiredOutcome:

        "Discovery meeting confirmed.",

    successCriteria: [

        "Decision maker identified",

        "Meeting date agreed",

        "Calendar invitation sent",

        "Next action recorded"

    ]

};

export const FollowUpObjective: BusinessObjective = {

    title: "Sales Follow-up",

    description:

        "Re-engage an existing prospect and move the opportunity forward.",

    desiredOutcome:

        "Prospect responds with a clear next step.",

    successCriteria: [

        "Contact reached",

        "Needs confirmed",

        "Next follow-up scheduled"

    ]

};