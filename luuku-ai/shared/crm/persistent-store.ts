import fs from "node:fs";
import path from "node:path";

export interface PersistentCRMState {
    companies: unknown[];
    contacts: unknown[];
    deals: unknown[];
    activities: unknown[];
}

const dataDirectory = path.resolve(process.cwd(), ".data");
const dataFile = path.join(dataDirectory, "crm.json");

const emptyState = (): PersistentCRMState => ({
    companies: [],
    contacts: [],
    deals: [],
    activities: [],
});

function ensureDataDirectory(): void {
    fs.mkdirSync(dataDirectory, { recursive: true });
}

function readState(): PersistentCRMState {
    try {
        const raw = fs.readFileSync(dataFile, "utf8");
        const parsed = JSON.parse(raw) as Partial<PersistentCRMState>;

        return {
            companies: Array.isArray(parsed.companies) ? parsed.companies : [],
            contacts: Array.isArray(parsed.contacts) ? parsed.contacts : [],
            deals: Array.isArray(parsed.deals) ? parsed.deals : [],
            activities: Array.isArray(parsed.activities) ? parsed.activities : [],
        };
    } catch {
        return emptyState();
    }
}

function writeState(state: PersistentCRMState): void {
    ensureDataDirectory();

    const temporaryFile = `${dataFile}.tmp`;
    fs.writeFileSync(temporaryFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    fs.renameSync(temporaryFile, dataFile);
}

export function loadCollection<T>(
    key: keyof PersistentCRMState,
    seed: T[] = [],
): T[] {
    const state = readState();
    const stored = state[key] as T[];

    if (stored.length > 0) {
        return stored;
    }

    if (seed.length > 0) {
        const nextState = {
            ...state,
            [key]: seed,
        };
        writeState(nextState);
    }

    return [...seed];
}

export function saveCollection<T>(
    key: keyof PersistentCRMState,
    values: T[],
): void {
    const state = readState();
    writeState({
        ...state,
        [key]: values,
    });
}

export function getPersistentCRMState(): PersistentCRMState {
    return readState();
}

export function clearPersistentCRM(): void {
    writeState(emptyState());
}
