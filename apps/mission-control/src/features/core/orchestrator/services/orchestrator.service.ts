import { useOrchestratorStore } from "@/store";

export function startGoal(goal: string) {
  useOrchestratorStore
    .getState()
    .startPlanning(goal);
}

export function startExecution() {
  useOrchestratorStore
    .getState()
    .startExecution();
}

export function finishGoal() {
  useOrchestratorStore
    .getState()
    .finish();
}

export function resetGoal() {
  useOrchestratorStore
    .getState()
    .reset();
}