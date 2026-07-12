import { prisma } from "../client";

import { Deal } from "../../domain/deal";

import { DealMapper } from "../mappers/deal.mapper";

import { BaseRepository } from "./base.repository";

export class DealRepository
    extends BaseRepository<Deal> {

    async findAll(): Promise<Deal[]> {

        const deals =
            await prisma.deal.findMany({

                orderBy: {

                    createdAt: "asc"

                }

            });

        return deals.map(
            DealMapper.toDomain
        );

    }

    async findById(
        id: string
    ): Promise<Deal | null> {

        const deal =
            await prisma.deal.findUnique({

                where: {

                    id

                }

            });

        if (!deal) {

            return null;

        }

        return DealMapper.toDomain(
            deal
        );

    }

    async findByCompany(
        companyId: string
    ): Promise<Deal[]> {

        const deals =
            await prisma.deal.findMany({

                where: {

                    companyId

                }

            });

        return deals.map(
            DealMapper.toDomain
        );

    }

    async create(
        deal: Deal
    ): Promise<Deal> {

        const created =
            await prisma.deal.create({

                data:
                    DealMapper.toPersistence(
                        deal
                    )

            });

        return DealMapper.toDomain(
            created
        );

    }

    async update(
        deal: Deal
    ): Promise<Deal> {

        const updated =
            await prisma.deal.update({

                where: {

                    id: deal.id

                },

                data:
                    DealMapper.toPersistence(
                        deal
                    )

            });

        return DealMapper.toDomain(
            updated
        );

    }

    async delete(
        id: string
    ): Promise<void> {

        await prisma.deal.delete({

            where: {

                id

            }

        });

    }

}

export const dealRepository =
    new DealRepository();