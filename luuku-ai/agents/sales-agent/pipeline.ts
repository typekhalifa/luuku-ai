import fs from "fs";
import path from "path";
import { addTimelineEvent } from "../../shared/services/timeline";
import { createFollowUpTask } from "../../shared/scheduler/followups";
import { saveTask } from "../../shared/scheduler/tasks";
import { updateProspect } from "../../shared/services/prospect";

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

    if (status === "contacted") {

        const task = createFollowUpTask(
            memory.business,
            3
        );

        saveTask(task);

    }

    const updated = updateProspect(
        business,
        {
            status
        }
    );

    return updated;

}