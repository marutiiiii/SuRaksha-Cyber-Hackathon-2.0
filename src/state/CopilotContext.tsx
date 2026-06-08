import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type CopilotMode = "beginner" | "intermediate" | "expert";

interface CopilotState {
  mode: CopilotMode;
  setMode: (m: CopilotMode) => void;
}

const Ctx = createContext<CopilotState | null>(null);
const STORAGE_KEY = "reguflow.copilot.mode";

export function CopilotProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<CopilotMode>(() => {
    if (typeof window === "undefined") return "intermediate";
    return (localStorage.getItem(STORAGE_KEY) as CopilotMode) || "intermediate";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
    document.documentElement.dataset.copilotMode = mode;
  }, [mode]);

  return <Ctx.Provider value={{ mode, setMode: setModeState }}>{children}</Ctx.Provider>;
}

export function useCopilot() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCopilot must be used within CopilotProvider");
  return v;
}

export const useIsBeginner = () => useCopilot().mode === "beginner";
export const useIsExpert = () => useCopilot().mode === "expert";