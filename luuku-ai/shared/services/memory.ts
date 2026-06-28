import fs from "fs";
import path from "path";

import { ProspectMemory } from "../types/memory";

const MEMORY_ROOT = path.join(
    process.cwd(),
    "luuku-ai",
    "memory",
    "prospects"
);

function ensureMemoryFolder() {
    if (!fs.existsSync(MEMORY_ROOT)) {
        fs.mkdirSync(MEMORY_ROOT, { recursive: true });
    }
}

export function saveProspect(memory: ProspectMemory) {
    ensureMemoryFolder();

    const file = path.join(
        MEMORY_ROOT,
        `${memory.business.toLowerCase().replace(/\s+/g, "-")}.json`
    );

    fs.writeFileSync(
        file,
        JSON.stringify(memory, null, 2)
    );

    return file;
}

export function loadProspect(name: string): ProspectMemory | null {

    ensureMemoryFolder();

    const file = path.join(
        MEMORY_ROOT,
        `${name.toLowerCase().replace(/\s+/g, "-")}.json`
    );

    if (!fs.existsSync(file)) {
        return null;
    }

    return JSON.parse(
        fs.readFileSync(file, "utf8")
    );
}

export function listProspects() {

    ensureMemoryFolder();

    return fs
        .readdirSync(MEMORY_ROOT)
        .filter(file => file.endsWith(".json"));
}