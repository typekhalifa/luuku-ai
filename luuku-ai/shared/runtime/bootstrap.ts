import {

    InMemoryTaskQueue

} from "../organization";

import {

    InMemoryWorkerManager

} from "../organization";

import {

    InMemoryOrganizationRuntime

} from "../organization";

import {

    SalesWorker

} from "../organization";

const queue =

    new InMemoryTaskQueue();

const workers =

    new InMemoryWorkerManager();

workers.register(

    new SalesWorker()

);

export const runtime =

    new InMemoryOrganizationRuntime(

        queue,

        workers

    );