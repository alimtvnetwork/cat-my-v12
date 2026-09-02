import React from "react";
import { Maximize, Scan, Palette, Wand2 } from "lucide-react";

export function ToolTabs({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}): React.JSX.Element | null {
  const tabs = [
    { id: "Search Region", icon: Maximize, disabled: false },
    { id: "Pattern Region", icon: Scan, disabled: false },
    { id: "Extract Colors", icon: Palette, disabled: true },
    { id: "Image Enhance", icon: Wand2, disabled: false },
  ];

  return (
    <div className="flex gap-2 p-2 bg-std-panel border-b border-std-border-dark">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isSelected = activeTab === tab.id;
        let buttonClass =
          "flex-1 flex flex-col items-center justify-center p-1 rounded border h-16 transition-colors ";

        if (tab.disabled) {
          buttonClass += "bg-std-chrome border-std-border-light opacity-50 cursor-not-allowed";
        } else if (isSelected) {
          buttonClass += "bg-std-accent-active border-std-border-dark shadow-inner";
        } else {
          buttonClass += "bg-std-secondary-action border-std-border-light hover:brightness-110";
        }

        const iconClass = isSelected
          ? "text-std-primary-action-text"
          : tab.disabled
            ? "text-std-text"
            : "text-std-text";
        const textClass = isSelected
          ? "text-std-primary-action-text"
          : tab.disabled
            ? "text-std-text"
            : "text-std-text";

        return (
          <button
            type="button"
            key={tab.id}
            disabled={tab.disabled}
            onClick={() => setActiveTab(tab.id)}
            className={buttonClass}
            title={tab.disabled ? "Not available for this image type" : tab.id}
          >
            <Icon className={`w-5 h-5 mb-1 ${iconClass}`} />
            <span className={`text-[10px] leading-tight text-center font-medium ${textClass}`}>
              {tab.id.split(" ").map((word, i) => (
                <React.Fragment key={i}>
                  {word}
                  {i === 0 && <br />}
                </React.Fragment>
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
