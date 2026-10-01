import type { Request, Response } from "express";
import { evaluateCompanyObservabilityAlerts } from "../../observability/alerts.js";

function companyIdOf(response: Response): string | undefined {
    return (response.locals.apiRequestContext as { companyId?: string } | undefined)?.companyId;
}

export async function getObservabilityAlerts(_request: Request, response: Response): Promise<void> {
    const companyId = companyIdOf(response);
    if (!companyId) {
        response.status(403).json({ error: "COMPANY_CONTEXT_REQUIRED" });
        return;
    }

    const alerts = await evaluateCompanyObservabilityAlerts(companyId);
    response.json({ alerts });
}
