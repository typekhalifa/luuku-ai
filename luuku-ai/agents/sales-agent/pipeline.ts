import fs from "fs";
import path from "path";

export function updateProspectStatus(
  business: string,
  status:
    | "researched"
    | "contacted"
    | "meeting-booked"
    | "proposal-sent"
    | "won"
    | "lost"
) {

  const slug = business
    .toLowerCase()
    .replace(/[^\w]+/g, "-");

  const file = path.join(
    process.cwd(),
    "luuku-ai",
    "memory",
    "prospects",
    `${slug}.json`
  );

  if (!fs.existsSync(file)) {
    throw new Error("Prospect not found.");
  }

  const memory = JSON.parse(
    fs.readFileSync(file, "utf8")
  );

  memory.status = status;
  memory.updatedAt = new Date().toISOString();

  fs.writeFileSync(
    file,
    JSON.stringify(memory, null, 2)
  );

  return memory;

}