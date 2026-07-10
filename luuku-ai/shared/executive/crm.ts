import { getCompanies } from "../crm/companies";

import { getContacts } from "../crm/contacts";

import { getDeals } from "../crm/deals/repository";

import { getActivities } from "../crm/activities/repository";

import { buildTimeline } from "../crm/timeline/builder";

export interface ExecutiveCRM {

    companies: number;

    contacts: number;

    deals: number;

    activities: number;

    timeline: number;

}

export function buildExecutiveCRM(): ExecutiveCRM {

    return {

        companies:

            getCompanies().length,

        contacts:

            getContacts().length,

        deals:

            getDeals().length,

        activities:

            getActivities().length,

        timeline:

            buildTimeline().length

    };

}