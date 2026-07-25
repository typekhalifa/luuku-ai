import type {

    RuntimeState,

} from "../types/runtime";

let state: RuntimeState = {

    activeAgent: null,

    currentTask: null,

    status: "idle",

};

export function getRuntime() {

    return state;

}

export function startRuntime(

    agent: string,

    task: string

) {

    state = {

        activeAgent: agent,

        currentTask: task,

        status: "running",

    };

}

export function stopRuntime() {

    state = {

        activeAgent: null,

        currentTask: null,

        status: "idle",

    };

}

export function setRuntime(runtime: RuntimeState) {

    state = runtime;

}