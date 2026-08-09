import { OrganizationState } from "../models/organization-state";

export function buildOrganizationState(): OrganizationState {

    return {

        runtime: {

            status: "starting",

            uptimeSeconds: 0

        },

        workers: {

            total: 0,

            online: 0,

            busy: 0,

            idle: 0,

            offline: 0

        },

        queue: {

            pending: 0,

            running: 0,

            completed: 0,

            failed: 0

        },

        health: {

            score: 100,

            status: "healthy"

        },

        metrics: {

            tasksCompletedToday: 0,

            tasksFailedToday: 0,

            averageExecutionTimeMs: 0

        },

        generatedAt: new Date().toISOString()

    };

}


/**
 * Creates the initial OrganizationState used when
 * Luuku AI boots for the first time.
 *
 * This builder is only responsible for initialization.
 * Live snapshots are composed by the OrganizationSnapshotComposer.
 */