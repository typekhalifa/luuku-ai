import { Contact } from "./types";

import {

    findCRMContact

} from "./repository";

export function resolveContact(

    company: string

): Contact | undefined {

    return findCRMContact(

        company

    );

}