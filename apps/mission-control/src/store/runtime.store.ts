import { create } from "zustand";

export interface RuntimeAgent {

  id: string;

  name: string;

  status: "idle" | "running" | "paused";

  task: string;

}

interface RuntimeStore {

  agents: RuntimeAgent[];

  startAgent: (id: string) => void;

  stopAgent: (id: string) => void;

  updateTask: (

    id: string,

    task: string

  ) => void;

}

export const useRuntimeStore =
create<RuntimeStore>((set) => ({

  agents: [

    {

      id: "research",

      name: "Research AI",

      status: "running",

      task: "Finding companies",

    },

    {

      id: "sales",

      name: "Sales AI",

      status: "idle",

      task: "Waiting",

    },

    {

      id: "executive",

      name: "Executive AI",

      status: "running",

      task: "Reviewing report",

    },

  ],

  startAgent: (id) =>

    set((state) => ({

      agents: state.agents.map((agent) =>

        agent.id === id

          ? {

              ...agent,

              status: "running",

            }

          : agent

      ),

    })),

  stopAgent: (id) =>

    set((state) => ({

      agents: state.agents.map((agent) =>

        agent.id === id

          ? {

              ...agent,

              status: "idle",

            }

          : agent

      ),

    })),

  updateTask: (

    id,

    task

  ) =>

    set((state) => ({

      agents: state.agents.map((agent) =>

        agent.id === id

          ? {

              ...agent,

              task,

            }

          : agent

      ),

    })),

}));