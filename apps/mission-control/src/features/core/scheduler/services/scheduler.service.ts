import type {

    SchedulerState,

} from "../types/scheduler";

let state: SchedulerState = {

    activeAgent: null,

    running: false,

};

export function getScheduler() {

    return state;

}

export function startScheduler(

    agent: string

) {

    state = {

        activeAgent: agent,

        running: true,

    };

}

export function stopScheduler() {

    state = {

        activeAgent: null,

        running: false,

    };

}