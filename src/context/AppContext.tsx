import React, { createContext, useContext, ReactNode, useMemo } from "react";
import { useTradingState } from "../hooks/useTradingState";
import { useLucaLinkState } from "../hooks/useLucaLinkState";
import { useVoiceSystem } from "../hooks/useVoiceSystem";
import { useManagementState } from "../hooks/useManagementState";
import { useDiagnostics } from "../hooks/useDiagnostics";
import { useVisualSystem } from "../hooks/app/useVisualSystem";

// Define the shape of our context
interface AppContextType {
  trading: ReturnType<typeof useTradingState>;
  lucaLink: ReturnType<typeof useLucaLinkState>;
  voice: ReturnType<typeof useVoiceSystem>;
  visual: ReturnType<typeof useVisualSystem>;
  management: ReturnType<typeof useManagementState>;
  diagnostics: ReturnType<typeof useDiagnostics>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const trading = useTradingState();
  const lucaLink = useLucaLinkState();
  const voice = useVoiceSystem();
  const visual = useVisualSystem();
  const management = useManagementState();
  const diagnostics = useDiagnostics();

  const value = useMemo(() => ({
    trading,
    lucaLink,
    voice,
    visual,
    management,
    diagnostics,
  }), [trading, lucaLink, voice, visual, management, diagnostics]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
