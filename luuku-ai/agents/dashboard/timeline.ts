import fs from "fs";
import path from "path";
import { ProspectMemory } from "../../shared/types/memory";
import { TimelineEvent } from "../../shared/types/timeline";

export function getLatestTimeline(): TimelineEvent[] {

    const folder = path.join(
        process.cwd(),
        "luuku-ai",
        "memory",
        "prospects"
    );

    if (!fs.existsSync(folder)) return [];

    const files = fs.readdirSync(folder);

    let events: TimelineEvent[] = [];

    for (const file of files) {

        if (!file.endsWith(".json")) continue;

        const prospect: ProspectMemory = JSON.parse(
            fs.readFileSync(path.join(folder, file), "utf8")
        );

        if (prospect.timeline) {
            events.push(...prospect.timeline);
        }

    }

    events.sort(
        (a, b) =>
            new Date(b.timestamp).getTime() -
            new Date(a.timestamp).getTime()
    );

    return events.slice(0, 10);

}