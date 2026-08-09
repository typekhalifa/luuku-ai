export * from "./id-generator";
export * from "./uuid-generator";

import { UUIDGenerator } from "./uuid-generator";

export const idGenerator = new UUIDGenerator();