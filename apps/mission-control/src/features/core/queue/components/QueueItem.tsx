import type { QueueTask } from "../types/queue";

interface Props {
  task: QueueTask;
}

export default function QueueItem({ task }: Props) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">

      <div className="flex items-center justify-between">

        <div>

          <h4 className="font-semibold">
            {task.title}
          </h4>

          <p className="text-sm text-neutral-500">
            {task.agent}
          </p>

        </div>

        <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs">

          {task.status}

        </span>

      </div>

      <div className="mt-4 h-2 rounded-full bg-neutral-800">

        <div
          className="h-full rounded-full bg-violet-500 transition-all"
          style={{
            width: `${task.progress}%`,
          }}
        />

      </div>

    </div>
  );
}