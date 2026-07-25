import {

  getRegistry,

} from "../services/registry.service";

export function useRegistry() {

  return getRegistry();

}