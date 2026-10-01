import type { Request, Response } from "express";

import { getRequestMetricSnapshot, renderPrometheusMetrics } from "../../observability";

export function getMetrics(
    _request: Request,
    response: Response,
): void {
    response.setHeader("content-type", "text/plain; version=0.0.4; charset=utf-8");
    response.status(200).send(renderPrometheusMetrics());
}

export function getMetricsSnapshot(
    _request: Request,
    response: Response,
): void {
    response.status(200).json({
        service: "luuku-api",
        status: "ok",
        metrics: getRequestMetricSnapshot(),
    });
}
