export type CapabilityStatus =
    | "available"
    | "simulation_only"
    | "unavailable";

export interface ExecutiveCapability {

    id: string;

    status: CapabilityStatus;

    description: string;

    safeForExternalExecution: boolean;

}

export function buildExecutiveCapabilities(): ExecutiveCapability[] {

    return [

        {

            id: "crm.read",

            status: "available",

            description: "Read CRM companies, contacts, deals, and activities.",

            safeForExternalExecution: true

        },

        {

            id: "crm.write",

            status: "available",

            description: "Create and update local CRM records and activities.",

            safeForExternalExecution: true

        },

        {

            id: "voice.call",

            status: "simulation_only",

            description: "Voice workflow exists, but no real telephony provider is connected.",

            safeForExternalExecution: false

        },

        {

            id: "email.send",

            status: "unavailable",

            description: "No real outbound email provider is connected to Luuku AI.",

            safeForExternalExecution: false

        },

        {

            id: "calendar.schedule",

            status: "unavailable",

            description: "No real calendar provider is connected to Luuku AI.",

            safeForExternalExecution: false

        }

    ];

}
