import {

    useState,

    useEffect,

} from "react";

import {

    getScheduler,

} from "../services/scheduler.service";

export function useScheduler() {

    const [

        scheduler,

        setScheduler,

    ] = useState(

        getScheduler()

    );

    useEffect(() => {

        const timer = setInterval(() => {

            setScheduler({

                ...getScheduler(),

            });

        }, 300);

        return () =>

            clearInterval(timer);

    }, []);

    return scheduler;

}