import {
    RegisterProspectRequest,
    registerProspectWorkflow
} from "./workflows/register-prospect.workflow";

import { companyService } from "../database/services/company.service";
import { contactService } from "../database/services/contact.service";
import { dealService } from "../database/services/deal.service";
import { activityService } from "../database/services/activity.service";

export class CRMApplication {

    async registerProspect(

        request: RegisterProspectRequest

    ) {

        return registerProspectWorkflow.execute(

            request

        );

    }

    async getCompanies() {

        return companyService.getCompanies();

    }

    async getCompanyContacts(

        companyId: string

    ) {

        return contactService.getCompanyContacts(

            companyId

        );

    }

    async getCompanyDeals(

        companyId: string

    ) {

        return dealService.getCompanyDeals(

            companyId

        );

    }

    async getCompanyActivities(

        companyId: string

    ) {

        return activityService.getCompanyActivities(

            companyId

        );

    }

}

export const crmApplication =
    new CRMApplication();