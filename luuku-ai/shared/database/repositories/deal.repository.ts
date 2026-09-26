import { prisma } from "../client";
import { Deal } from "../../domain/deal";
import { DealMapper } from "../mappers/deal.mapper";
import { BaseRepository } from "./base.repository";

export class DealRepository extends BaseRepository<Deal> {
    async findAll(companyId: string): Promise<Deal[]> {
        const deals = await prisma.deal.findMany({
            where: { companyId },
            orderBy: { createdAt: "asc" }
        });
        return deals.map(DealMapper.toDomain);
    }

    async findAllSystem(): Promise<Deal[]> {
        const deals = await prisma.deal.findMany({
            orderBy: { createdAt: "asc" }
        });
        return deals.map(DealMapper.toDomain);
    }

    async findById(id: string, companyId: string): Promise<Deal | null> {
        const deal = await prisma.deal.findFirst({
            where: { id, companyId }
        });

        if (!deal) return null;
        return DealMapper.toDomain(deal);
    }

    async findByIdSystem(id: string): Promise<Deal | null> {
        const deal = await prisma.deal.findUnique({ where: { id } });

        if (!deal) return null;
        return DealMapper.toDomain(deal);
    }

    async findByCompany(companyId: string): Promise<Deal[]> {
        const deals = await prisma.deal.findMany({ where: { companyId } });
        return deals.map(DealMapper.toDomain);
    }

    async create(deal: Deal, companyId: string): Promise<Deal> {
        if (deal.companyId !== companyId) {
            throw new Error("DEAL_TENANT_MISMATCH");
        }

        const created = await prisma.deal.create({
            data: DealMapper.toPersistence(deal)
        });
        return DealMapper.toDomain(created);
    }

    async createSystem(deal: Deal): Promise<Deal> {
        const created = await prisma.deal.create({
            data: DealMapper.toPersistence(deal)
        });
        return DealMapper.toDomain(created);
    }

    async update(deal: Deal, companyId: string): Promise<Deal> {
        const owned = await prisma.deal.findFirst({
            where: { id: deal.id, companyId },
            select: { id: true }
        });
        if (!owned) throw new Error("DEAL_NOT_FOUND_OR_UNAUTHORIZED");

        const updated = await prisma.deal.update({
            where: { id: deal.id },
            data: DealMapper.toPersistence(deal)
        });
        return DealMapper.toDomain(updated);
    }

    async updateSystem(deal: Deal): Promise<Deal> {
        const updated = await prisma.deal.update({
            where: { id: deal.id },
            data: DealMapper.toPersistence(deal)
        });
        return DealMapper.toDomain(updated);
    }

    async delete(id: string, companyId: string): Promise<void> {
        const owned = await prisma.deal.findFirst({
            where: { id, companyId },
            select: { id: true }
        });
        if (!owned) throw new Error("DEAL_NOT_FOUND_OR_UNAUTHORIZED");

        await prisma.deal.delete({ where: { id } });
    }

    async deleteSystem(id: string): Promise<void> {
        await prisma.deal.delete({ where: { id } });
    }
}

export const dealRepository = new DealRepository();
