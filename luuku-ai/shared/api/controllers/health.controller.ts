import type { Request, Response } from "express";
import { prisma } from "../../database/client";
import { productionExecutiveHost } from "../../../os/executive/production-executive-host.js";

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
    let database: "ok" | "unavailable" = "unavailable";
    try {
        await prisma.$queryRaw`SELECT 1`;
        database = "ok";
    } catch {
        // Report readiness below without exposing internal database errors.
    }

    const executive = productionExecutiveHost.isStarted() ? "ready" : "not_ready";
    const ready = database === "ok" && executive === "ready";

    response.status(ready ? 200 : 503).json({
        status: ready ? "ready" : "not_ready",
        service: "luuku-api",
        database,
        executive,
    });
}
