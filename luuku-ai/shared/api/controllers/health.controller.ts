import type { Request, Response } from "express";
import { prisma } from "../../database/client";

export async function healthzController(
    _request: Request,
    response: Response,
): Promise<void> {
    response.status(200).json({
        status: "ok",
        service: "luuku-api",
    });
}

export async function readyzController(
    _request: Request,
    response: Response,
): Promise<void> {
    try {
        await prisma.$queryRaw`SELECT 1`;

        response.status(200).json({
            status: "ready",
            service: "luuku-api",
            database: "ok",
        });
    } catch {
        response.status(503).json({
            status: "not_ready",
            service: "luuku-api",
            database: "unavailable",
        });
    }
}
