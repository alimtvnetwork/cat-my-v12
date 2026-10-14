export const GUIDED_SIMULATION_COMMAND_EVENT = "ca:guided-simulation-command";
export const GUIDED_SIMULATION_STATE_EVENT = "ca:guided-simulation-state";

export type GuidedSimulationCommand = "start" | "stop";

export interface GuidedSimulationCommandDetail {
  command: GuidedSimulationCommand;
}

export interface GuidedSimulationStateDetail {
  isRunning: boolean;
}
