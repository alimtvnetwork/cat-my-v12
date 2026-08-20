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
    <div className="flex gap-2 p-2 bg-ca-panel border-b border-ca-border">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isSelected = activeTab === tab.id;
        let buttonClass =
          "flex-1 flex flex-col items-center justify-center p-1 rounded border h-16 transition-colors ";

        if (tab.disabled) {
          buttonClass += "bg-gray-100 border-gray-200 text-gray-400 opacity-50 cursor-not-allowed";
        } else if (isSelected) {
          buttonClass += "bg-amber-400 border-amber-500 shadow-inner";
        } else {
          buttonClass += "bg-gray-200 border-gray-300 text-gray-700 hover:bg-gray-300";
        }

        const iconClass = isSelected
          ? "text-green-700"
          : tab.disabled
            ? "text-gray-400"
            : "text-gray-600";
        const textClass = isSelected
          ? "text-black"
          : tab.disabled
            ? "text-gray-400"
            : "text-gray-700";

        return (
          <button
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
