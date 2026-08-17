import { ReactNode } from "react";

interface CanvasResultLayerProps {
  children?: ReactNode;
  visible: boolean;
  status?: "pass" | "fail" | null;
}

export function CanvasResultLayer({ children, visible, status }: CanvasResultLayerProps): React.JSX.Element | null {
  if (!visible) return null;
  
  const borderColor = status === "pass" ? "border-green-500" : status === "fail" ? "border-red-500" : "border-transparent";
  
  return (
    <div className={`absolute inset-0 z-20 pointer-events-none border-4 ${borderColor}`}>
      {status && (
        <div className="absolute top-2 right-2 pointer-events-auto">
          <span className={`px-2 py-1 text-[13px] tabular-nums font-bold text-white rounded ${status === "pass" ? "bg-green-500" : "bg-red-500"}`}>
            {status.toUpperCase()}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
