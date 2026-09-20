import { Deal } from "../../domain/deal";

import { dealRepository } from "../repositories/deal.repository";

export class DealService {
    async getDeals(companyId?: string): Promise<Deal[]> {
        return dealRepository.findAll(companyId);
    }

    async getDeal(id: string, companyId?: string): Promise<Deal | null> {
        return dealRepository.findById(id, companyId);
    }

    async getCompanyDeals(companyId: string, requesterCompanyId?: string): Promise<Deal[]> {
        if (requesterCompanyId && companyId !== requesterCompanyId) {
            throw new Error("COMPANY_TENANT_MISMATCH");
        }
        return dealRepository.findByCompany(companyId);
    }

    async createDeal(deal: Deal, companyId?: string): Promise<Deal> {
        return dealRepository.create(deal, companyId);
    }

    async updateDeal(deal: Deal, companyId?: string): Promise<Deal> {
        return dealRepository.update(deal, companyId);
    }

    async deleteDeal(id: string, companyId?: string): Promise<void> {
        await dealRepository.delete(id, companyId);
    }
}

export const dealService = new DealService();
