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

function isRealEmailConfigured(): boolean {
    return Boolean(
        process.env.RESEND_API_KEY &&
        process.env.RESEND_FROM_EMAIL
    );
}

export function buildExecutiveCapabilities(): ExecutiveCapability[] {

    const emailAvailable =
        isRealEmailConfigured();

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

            status:
                emailAvailable
                    ? "available"
                    : "unavailable",

            description:
                emailAvailable
                    ? "Real outbound email is connected through the configured Resend provider."
                    : "No real outbound email provider is configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",

            safeForExternalExecution:
                emailAvailable

        },

        {

            id: "calendar.schedule",

            status: "unavailable",

            description: "No real calendar provider is connected to Luuku AI.",

            safeForExternalExecution: false

        }

    ];

}
