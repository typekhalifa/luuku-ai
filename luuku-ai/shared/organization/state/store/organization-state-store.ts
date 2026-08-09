import { InMemoryOrganizationState } from "../implementations/in-memory-organization-state";

const organizationState =

    new InMemoryOrganizationState();

export function getOrganizationState(): InMemoryOrganizationState {

    return organizationState;

}