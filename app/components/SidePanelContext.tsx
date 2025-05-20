import React, { createContext, useContext, useState } from "react";

interface SidePanelContextType {
  isCollapsed: boolean;
  toggle: () => void;
}

const SidePanelContext = createContext<SidePanelContextType | undefined>(undefined);

export const SidePanelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const toggle = () => setIsCollapsed((prev) => !prev);

  return (
    <SidePanelContext.Provider value={{ isCollapsed, toggle }}>
      {children}
    </SidePanelContext.Provider>
  );
};

export const useSidePanel = () => {
  const ctx = useContext(SidePanelContext);
  if (!ctx) throw new Error("useSidePanel must be used within a SidePanelProvider");
  return ctx;
}; 