import "dotenv/config";

import { bootstrapFromEnv } from "../shared/auth/auth.service";

bootstrapFromEnv()
    .then(() => {
        console.log("AUTH BOOTSTRAP: PASS");
    })
    .catch((error) => {
        console.error("AUTH BOOTSTRAP: FAIL", error);
        process.exitCode = 1;
    });
