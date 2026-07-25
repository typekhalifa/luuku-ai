import {

  getTools,

} from "../services/tool-registry.service";

export function useTools() {

  return getTools();

}