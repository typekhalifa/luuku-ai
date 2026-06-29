import fs from "fs";
import path from "path";
import { addTimelineEvent } from "../../shared/services/timeline";

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

    addTimelineEvent(

    memory,

    "Sales Agent",

    `Status updated to ${status}`,

    `Pipeline moved to ${status}`

    );

}