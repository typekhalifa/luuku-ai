import { Deal } from "../../domain/deal";

import { dealRepository } from "../repositories/deal.repository";

export class DealService {

    async getDeals(): Promise<Deal[]> {

        return dealRepository.findAll();

    }

    async getDeal(
        id: string
    ): Promise<Deal | null> {

        return dealRepository.findById(
            id
        );

    }

    async getCompanyDeals(
        companyId: string
    ): Promise<Deal[]> {

        return dealRepository.findByCompany(
            companyId
        );

    }

    async createDeal(
        deal: Deal
    ): Promise<Deal> {

        return dealRepository.create(
            deal
        );

    }

    async updateDeal(
        deal: Deal
    ): Promise<Deal> {

        return dealRepository.update(
            deal
        );

    }

    async deleteDeal(
        id: string
    ): Promise<void> {

        await dealRepository.delete(
            id
        );

    }

}

export const dealService =
    new DealService();