import fs from "fs";
import path from "path";

const KNOWLEDGE_DIR = path.join(process.cwd(), "luuku-ai", "knowledge");

export function loadIndustry(name: string) {
    const file = path.join(
        KNOWLEDGE_DIR,
        "industries",
        `${name.toLowerCase()}.json`
    );

    if (!fs.existsSync(file)) {
        return null;
    }

    return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function loadOffer(name: string) {
    const file = path.join(
        KNOWLEDGE_DIR,
        "offers",
        `${name}.json`
    );

    if (!fs.existsSync(file)) {
        return null;
    }

    return JSON.parse(fs.readFileSync(file, "utf8"));
}