export const GUIDED_SIMULATION_COMMAND_EVENT = "ca:guided-simulation-command";
export const GUIDED_SIMULATION_STATE_EVENT = "ca:guided-simulation-state";
export const GUIDED_SIMULATION_ANALYSIS_EVENT = "ca:guided-simulation-analysis";
export const GUIDED_SIMULATION_MENU_EVENT = "ca:guided-simulation-menu";

export type GuidedSimulationCommand =
  | "start"
  | "stop"
  | "advance"
  | "pause"
  | "resume"
  | "previous"
  | "take_over";

export interface GuidedSimulationCommandDetail {
  command: GuidedSimulationCommand;
}

export interface GuidedSimulationStateDetail {
  isRunning: boolean;
  isLoading: boolean;
  isPaused?: boolean;
}

export interface GuidedSimulationAnalysisDetail {
  isLoading: boolean;
}

export interface GuidedSimulationMenuDetail {
  isOpen: boolean;
}
