import { create } from "zustand";

export type OrchestratorStage =
  | "idle"
  | "planning"
  | "executing"
  | "completed";

interface OrchestratorStore {
  goal: string | null;
  stage: OrchestratorStage;

  startPlanning: (goal: string) => void;
  startExecution: () => void;
  finish: () => void;
  reset: () => void;
}

export const useOrchestratorStore =
  create<OrchestratorStore>((set) => ({

    goal: null,

    stage: "idle",

    startPlanning: (goal) =>
      set({
        goal,
        stage: "planning",
      }),

    startExecution: () =>
      set({
        stage: "executing",
      }),

    finish: () =>
      set({
        stage: "completed",
      }),

    reset: () =>
      set({
        goal: null,
        stage: "idle",
      }),

  }));