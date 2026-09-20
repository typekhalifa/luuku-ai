import { prisma } from "../client";
import { Activity } from "../../domain/activity";
import { ActivityMapper } from "../mappers/activity.mapper";

export class ActivityRepository {
    async findAll(companyId?: string): Promise<Activity[]> {
        const activities = await prisma.activity.findMany({
            where: companyId ? { companyId } : undefined,
            orderBy: { createdAt: "desc" }
        });
        return activities.map(ActivityMapper.toDomain);
    }

    async findByCompany(companyId: string): Promise<Activity[]> {
        const activities = await prisma.activity.findMany({
            where: { companyId },
            orderBy: { createdAt: "desc" }
        });
        return activities.map(ActivityMapper.toDomain);
    }

    async findIncomplete(limit?: number, companyId?: string): Promise<Activity[]> {
        const activities = await prisma.activity.findMany({
            where: {
                completed: false,
                ...(companyId ? { companyId } : {})
            },
            orderBy: { createdAt: "asc" },
            ...(limit ? { take: limit } : {})
        });
        return activities.map(ActivityMapper.toDomain);
    }

    async findOverdue(limit?: number, companyId?: string): Promise<Activity[]> {
        const activities = await prisma.activity.findMany({
            where: {
                completed: false,
                dueAt: { lt: new Date() },
                ...(companyId ? { companyId } : {})
            },
            orderBy: { dueAt: "asc" },
            ...(limit ? { take: limit } : {})
        });
        return activities.map(ActivityMapper.toDomain);
    }

    async findByIds(ids: string[], companyId?: string): Promise<Activity[]> {
        if (ids.length === 0) return [];
        const activities = await prisma.activity.findMany({
            where: {
                id: { in: ids },
                ...(companyId ? { companyId } : {})
            }
        });
        return activities.map(ActivityMapper.toDomain);
    }

    async updateOutcome(
        id: string,
        outcome: string,
        description?: string,
        companyId?: string
    ): Promise<Activity> {
        if (companyId) {
            const owned = await prisma.activity.findFirst({
                where: { id, companyId },
                select: { id: true }
            });
            if (!owned) throw new Error("ACTIVITY_NOT_FOUND_OR_UNAUTHORIZED");
        }

        const updated = await prisma.activity.update({
            where: { id },
            data: {
                outcome,
                ...(description !== undefined ? { description } : {})
            }
        });
        return ActivityMapper.toDomain(updated);
    }

    async create(activity: Activity, companyId?: string): Promise<Activity> {
        if (companyId && activity.companyId !== companyId) {
            throw new Error("ACTIVITY_TENANT_MISMATCH");
        }

        const created = await prisma.activity.create({
            data: ActivityMapper.toPersistence(activity)
        });
        return ActivityMapper.toDomain(created);
    }
}

export const activityRepository = new ActivityRepository();
