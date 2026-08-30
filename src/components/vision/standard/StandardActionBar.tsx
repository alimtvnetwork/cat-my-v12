import React from "react";
import { Settings } from "lucide-react";
import { StandardActionLabel } from "./constants";

export interface StandardActionBarProps {
  onEvaluate?: () => void;
  onOriginPoint?: () => void;
  onDisplay?: () => void;
  onRegisterImage?: () => void;
  onSettings?: () => void;
  onCancel?: () => void;
  onOk?: () => void;
}

export function StandardActionBar({
  onEvaluate,
  onOriginPoint,
  onDisplay,
  onRegisterImage,
  onSettings,
  onCancel,
  onOk,
}: StandardActionBarProps): React.JSX.Element | null {
  return (
    <div className="flex items-center justify-between px-2 bg-std-chrome h-14 shrink-0 font-sans tracking-wide text-sm border-t border-std-border-dark">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOriginPoint}
          className="h-[28px] px-4 bg-std-secondary-action border-t border-l border-std-border-light border-b-2 border-r-2 border-std-border-dark text-std-text hover:brightness-110 active:border-t-2 active:border-l-2 active:border-b active:border-r flex items-center justify-center"
        >
          {StandardActionLabel.OriginPoint}
        </button>
        <button
          type="button"
          onClick={onDisplay}
          className="h-[28px] px-4 bg-std-secondary-action border-t border-l border-std-border-light border-b-2 border-r-2 border-std-border-dark text-std-text hover:brightness-110 active:border-t-2 active:border-l-2 active:border-b active:border-r flex items-center justify-center"
        >
          {StandardActionLabel.Display}
        </button>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRegisterImage}
            className="h-[28px] px-4 bg-std-secondary-action border-t border-l border-std-border-light border-b-2 border-r-2 border-std-border-dark text-std-text hover:brightness-110 active:border-t-2 active:border-l-2 active:border-b active:border-r flex items-center justify-center"
          >
            {StandardActionLabel.RegisterImage}
          </button>
          <button
            type="button"
            onClick={onEvaluate}
            className="h-[28px] px-8 bg-std-primary-action border-t border-l border-std-border-light border-b-2 border-r-2 border-std-border-dark text-std-primary-action-text font-medium hover:brightness-110 active:border-t-2 active:border-l-2 active:border-b active:border-r flex items-center justify-center"
          >
            {StandardActionLabel.EvaluateRule}
          </button>
          <button
            type="button"
            onClick={onSettings}
            aria-label={StandardActionLabel.Settings}
            className="h-[28px] w-[36px] flex items-center justify-center bg-std-secondary-action border-t border-l border-std-border-light border-b-2 border-r-2 border-std-border-dark text-std-text hover:brightness-110 active:border-t-2 active:border-l-2 active:border-b active:border-r"
          >
            <Settings size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-[28px] px-6 bg-std-secondary-action border-t border-l border-std-border-light border-b-2 border-r-2 border-std-border-dark text-std-text hover:brightness-110 active:border-t-2 active:border-l-2 active:border-b active:border-r flex items-center justify-center"
          >
            {StandardActionLabel.Cancel}
          </button>
          <button
            type="button"
            onClick={onOk}
            className="h-[28px] px-8 bg-std-secondary-action border-t border-l border-std-border-light border-b-2 border-r-2 border-std-border-dark text-std-text hover:brightness-110 active:border-t-2 active:border-l-2 active:border-b active:border-r flex items-center justify-center"
          >
            {StandardActionLabel.Ok}
          </button>
        </div>
      </div>
    </div>
  );
}
