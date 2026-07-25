import { api } from "@/sdk/client";

import type { CRMOverview } from "@/features/crm";

export class CRMClient {

    async getOverview(): Promise<CRMOverview> {

        return api.get("/crm");

    }

}

export const crmClient =
    new CRMClient();