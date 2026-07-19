import {
  BrainCircuit,
  Send,
} from "lucide-react";

export default function AICopilot() {
  return (
    <aside className="flex h-full flex-col rounded-3xl border border-white/10 bg-[#101114]">

      <div className="border-b border-white/10 p-5">

        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/10">

            <BrainCircuit
              size={20}
              className="text-violet-400"
            />

          </div>

          <div>

            <h2 className="font-semibold">
              Executive AI
            </h2>

            <p className="text-xs text-neutral-500">
              Operational Copilot
            </p>

          </div>

        </div>

      </div>

      <div className="flex-1 space-y-4 overflow-auto p-5">

        <Message
          role="assistant"
          content="Good morning. System health is 98.9%. Revenue is up 18%."
        />

        <Message
          role="assistant"
          content="Three workflows require review."
        />

      </div>

      <div className="border-t border-white/10 p-4">

        <div className="flex gap-3">

          <input
            placeholder="Ask Executive AI..."
            className="flex-1 rounded-2xl border border-white/10 bg-[#151515] px-4 py-3 outline-none focus:border-violet-500"
          />

          <button className="rounded-2xl bg-violet-600 p-3 hover:bg-violet-500">

            <Send size={18} />

          </button>

        </div>

      </div>

    </aside>
  );
}

function Message({
  role,
  content,
}: {
  role: "assistant" | "user";
  content: string;
}) {
  return (
    <div
      className={`rounded-2xl p-4 text-sm leading-7 ${
        role === "assistant"
          ? "bg-white/[0.03]"
          : "bg-violet-600/10"
      }`}
    >
      {content}
    </div>
  );
}