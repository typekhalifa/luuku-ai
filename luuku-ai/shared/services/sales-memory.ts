import fs from "fs";
import path from "path";
import { ProspectMemory } from "../types/memory";

const MEMORY_DIR = path.join(
    process.cwd(),
    "luuku-ai",
    "memory",
    "prospects"
);

function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s+/g, "-");
}

export function loadProspectMemory(
    business: string
): ProspectMemory | null {

    const file = path.join(
        MEMORY_DIR,
        `${slugify(business)}.json`
    );

    if (!fs.existsSync(file)) {
        return null;
    }

    return JSON.parse(
        fs.readFileSync(file, "utf8")
    );

}

export function saveProspect(
    prospect: ProspectMemory
): void {

    if (!fs.existsSync(MEMORY_DIR)) {

        fs.mkdirSync(MEMORY_DIR, {
            recursive: true
        });

    }

    const file = path.join(
        MEMORY_DIR,
        `${slugify(prospect.business)}.json`
    );

    fs.writeFileSync(
        file,
        JSON.stringify(prospect, null, 2)
    );

}

export function updateProspectStatus(
    business: string,
    status: ProspectMemory["status"]
): ProspectMemory | null {

    const prospect = loadProspectMemory(
        business
    );

    if (!prospect) {
        return null;
    }

    prospect.status = status;
    prospect.updatedAt = new Date().toISOString();

    saveProspect(prospect);

    return prospect;

}