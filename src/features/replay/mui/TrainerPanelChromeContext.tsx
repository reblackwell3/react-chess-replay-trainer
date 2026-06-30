import React, { createContext, useContext } from 'react';

const TrainerPanelChromeContext = createContext<React.ReactNode>(null);

export const TrainerPanelChromeProvider: React.FC<{
  children: React.ReactNode;
  sidebarLeading?: React.ReactNode;
}> = ({ children, sidebarLeading }) => (
  <TrainerPanelChromeContext.Provider value={sidebarLeading}>
    {children}
  </TrainerPanelChromeContext.Provider>
);

export const useTrainerPanelChrome = () => useContext(TrainerPanelChromeContext);
