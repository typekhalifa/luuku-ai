import { api } from "../../../services/api";

export function getEvents() {

    return api<any[]>(

        "/events"

    );

}