import fs from "fs";
import path from "path";

import { ExecutiveDecision } from "../../agents/executive-ai/decision";

const HISTORY_DIR = path.join(

    process.cwd(),

    "luuku-ai",

    "memory",

    "executive",

    "decisions"

);

export function saveExecutiveDecision(

    decision: ExecutiveDecision

) {

    if (!fs.existsSync(HISTORY_DIR)) {

        fs.mkdirSync(HISTORY_DIR, {

            recursive: true

        });

    }

    const timestamp = new Date()

        .toISOString()

        .replace(/:/g, "-");

    const file = path.join(

        HISTORY_DIR,

        `${timestamp}.json`

    );

    fs.writeFileSync(

        file,

        JSON.stringify({

            timestamp:

                new Date().toISOString(),

            ...decision

        }, null, 2)

    );

}

export function loadExecutiveHistory() {

    if (!fs.existsSync(HISTORY_DIR)) {

        return [];

    }

    return fs.readdirSync(HISTORY_DIR)

        .filter(file => file.endsWith(".json"))

        .sort()

        .reverse()

        .map(file =>

            JSON.parse(

                fs.readFileSync(

                    path.join(HISTORY_DIR, file),

                    "utf8"

                )

            )

        );

}