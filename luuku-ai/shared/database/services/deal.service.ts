import { Deal } from "../../domain/deal";

import { dealRepository } from "../repositories/deal.repository";

export class DealService {
    async getDeals(companyId: string): Promise<Deal[]> {
        return dealRepository.findAll(companyId);
    }

    async getDealsSystem(): Promise<Deal[]> {
        return dealRepository.findAllSystem();
    }

    async getDeal(id: string, companyId: string): Promise<Deal | null> {
        return dealRepository.findById(id, companyId);
    }

    async getDealSystem(id: string): Promise<Deal | null> {
        return dealRepository.findByIdSystem(id);
    }

    async getCompanyDeals(companyId: string, requesterCompanyId: string): Promise<Deal[]> {
        if (companyId !== requesterCompanyId) {
            throw new Error("COMPANY_TENANT_MISMATCH");
        }
        return dealRepository.findByCompany(companyId);
    }

    async getCompanyDealsSystem(companyId: string): Promise<Deal[]> {
        return dealRepository.findByCompany(companyId);
    }

    async createDeal(deal: Deal, companyId: string): Promise<Deal> {
        return dealRepository.create(deal, companyId);
    }

    async createDealSystem(deal: Deal): Promise<Deal> {
        return dealRepository.createSystem(deal);
    }

    async updateDeal(deal: Deal, companyId: string): Promise<Deal> {
        return dealRepository.update(deal, companyId);
    }

    async updateDealSystem(deal: Deal): Promise<Deal> {
        return dealRepository.updateSystem(deal);
    }

    async deleteDeal(id: string, companyId: string): Promise<void> {
        await dealRepository.delete(id, companyId);
    }

    async deleteDealSystem(id: string): Promise<void> {
        await dealRepository.deleteSystem(id);
    }
}

export const dealService = new DealService();
