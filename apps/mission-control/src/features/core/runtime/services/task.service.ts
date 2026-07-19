import type {
  RuntimeTask,
} from "../types/task";

export async function getRuntimeTasks():

Promise<RuntimeTask[]> {

  return [

    {
      id: "1",
      title: "Research Rwanda Fintech",
      assignedTo: "Research AI",
      priority: "high",
      status: "running",
      createdAt: "2 sec ago",
    },

    {
      id: "2",
      title: "Qualify Enterprise Lead",
      assignedTo: "Sales AI",
      priority: "medium",
      status: "queued",
      createdAt: "12 sec ago",
    },

    {
      id: "3",
      title: "Generate Weekly Report",
      assignedTo: "Executive AI",
      priority: "high",
      status: "completed",
      createdAt: "1 min ago",
    },

  ];

}