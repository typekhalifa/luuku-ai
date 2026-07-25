import { api } from "@/sdk/client";
import type { RuntimeStatus } from "@/features/runtime";

export class RuntimeClient {

    async getStatus(): Promise<RuntimeStatus> {

        return api.get("/runtime");

    }

}

export const runtimeClient =
    new RuntimeClient();