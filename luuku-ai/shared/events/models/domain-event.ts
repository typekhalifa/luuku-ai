import { Event } from "./event";

export interface DomainEvent<T = unknown> extends Event {

    payload: T;

}