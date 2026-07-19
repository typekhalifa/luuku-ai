import QueueItem from "./QueueItem";

import { useQueue } from "../hooks/useQueue";

export default function TaskQueue() {
  const tasks = useQueue();

  return (
    <div className="rounded-3xl border border-neutral-900 bg-neutral-950 p-6">

      <h2 className="mb-6 text-xl font-semibold">

        Task Queue

      </h2>

      <div className="space-y-4">

        {tasks.map((task) => (

          <QueueItem
            key={task.id}
            task={task}
          />

        ))}

      </div>

    </div>
  );
}