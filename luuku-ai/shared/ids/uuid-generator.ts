import { IdGenerator } from "./id-generator";

export class UUIDGenerator implements IdGenerator {

    generate(): string {

        return crypto.randomUUID();

    }

}