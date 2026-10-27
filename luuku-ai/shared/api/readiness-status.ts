export type DatabaseReadiness = "ok" | "unavailable";
export type ExecutiveReadiness = "ready" | "not_ready";

export interface ApiReadiness {
    status: "ready" | "not_ready";
    httpStatus: 200 | 503;
    database: DatabaseReadiness;
    executive: ExecutiveReadiness;
}

export function getApiReadiness(
    database: DatabaseReadiness,
    executive: ExecutiveReadiness,
): ApiReadiness {
    const ready = database === "ok" && executive === "ready";
    return {
        status: ready ? "ready" : "not_ready",
        httpStatus: ready ? 200 : 503,
        database,
        executive,
    };
}
