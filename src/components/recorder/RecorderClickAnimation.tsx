import React, { useEffect, useState } from "react";
import "@/styles/spring-animation.css";

export interface SpringPulseDetail {
  id: string;
  x: number;
  y: number;
  stepNumber: number;
}

export function RecorderClickAnimation(): React.JSX.Element | null {
  const [pulses, setPulses] = useState<SpringPulseDetail[]>([]);

  useEffect(() => {
    const activeTimers = new Set<number>();

    const handleSpringClick = (event: Event) => {
      const customEvent = event as CustomEvent<SpringPulseDetail>;

      if (!customEvent.detail) {
        return;
      }

      const pulse = customEvent.detail;
      setPulses((prev) => [...prev, pulse]);

      const timerId = window.setTimeout(() => {
        setPulses((prev) => prev.filter((p) => p.id !== pulse.id));
        activeTimers.delete(timerId);
      }, 600);

      activeTimers.add(timerId);
    };

    window.addEventListener("cat:recorder-spring-click", handleSpringClick);

    return () => {
      window.removeEventListener("cat:recorder-spring-click", handleSpringClick);
      activeTimers.forEach((timerId) => window.clearTimeout(timerId));
      activeTimers.clear();
    };
  }, []);

  if (pulses.length === 0) {
    return null;
  }

  return (
    <div className="recorder-spring-container" aria-hidden="true">
      {pulses.map((pulse) => (
        <React.Fragment key={pulse.id}>
          <div
            className="recorder-spring-pulse"
            style={{ left: `${pulse.x}px`, top: `${pulse.y}px` }}
          />
          <div
            className="recorder-step-badge"
            style={{ left: `${pulse.x}px`, top: `${pulse.y}px` }}
          >
            Step #{pulse.stepNumber}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
