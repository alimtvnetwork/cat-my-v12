import React, { createContext, useContext, useState } from "react";

// Task 131: Sync Coordinates in Split View (Ensure ROIs map accurately to both views via shared coordinate context)

export const CoordinateContext = createContext<any>(null);

export const CoordinateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [coordinates, setCoordinates] = useState({ x: 0, y: 0, zoom: 1 });
  return (
    <CoordinateContext.Provider value={{ coordinates, setCoordinates }}>
      {children}
    </CoordinateContext.Provider>
  );
};

export const SplitViewCanvas: React.FC = () => {
  return (
    <CoordinateProvider>
      <div className="flex flex-row split-layout">
        <div className="static-reference flex-1" />
        <div className="live-camera flex-1" />
      </div>
    </CoordinateProvider>
  );
};
