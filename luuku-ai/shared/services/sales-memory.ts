import fs from "fs";
import path from "path";

const MEMORY_DIR = path.join(
  process.cwd(),
  "luuku-ai",
  "memory",
  "prospects"
);

export function loadProspectMemory(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/\s+/g, "-");

  const file = path.join(MEMORY_DIR, `${slug}.json`);

  if (!fs.existsSync(file)) {
    return null;
  }

  return JSON.parse(
    fs.readFileSync(file, "utf8")
  );
}