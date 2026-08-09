import { OrganizationState } from "../models/organization-state";

export interface OrganizationStateService {

    getState(): Promise<OrganizationState>;

}