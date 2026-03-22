import { useState, useCallback, useMemo } from "react";

export interface VisualSystemState {
  isVisionActive: boolean;
  setIsVisionActive: (active: boolean) => void;
  visualData: any;
  setVisualData: (data: any) => void;
  voiceSearchResults: any;
  setVoiceSearchResults: (results: any) => void;
  visionPerformanceMode: "high" | "balanced" | "eco";
  setVisionPerformanceMode: (mode: "high" | "balanced" | "eco") => void;
}

export function useVisualSystem(): VisualSystemState {
  const [isVisionActive, setIsVisionActive] = useState(false);
  const [visualData, setInternalVisualData] = useState<any>(null);
  const [voiceSearchResults, setVoiceSearchResults] = useState<any>(null);
  const [visionPerformanceMode, setVisionPerformanceMode] = useState<
    "high" | "balanced" | "eco"
  >("balanced");

  const setVisualData = useCallback((data: any) => {
    setInternalVisualData((prev: any) => {
      if (!data || !prev || data.type !== prev.type) {
        return data;
      }

      if (data.logs && prev.logs) {
        const existingIds = new Set(prev.logs.map((l: any) => l.id));
        const newLogs = data.logs.filter((l: any) => !existingIds.has(l.id));

        return {
          ...data,
          logs: [...prev.logs, ...newLogs],
        };
      }

      return data;
    });
  }, []);

  return useMemo(() => ({
    isVisionActive,
    setIsVisionActive,
    visualData,
    setVisualData,
    voiceSearchResults,
    setVoiceSearchResults,
    visionPerformanceMode,
    setVisionPerformanceMode,
  }), [isVisionActive, visualData, setVisualData, voiceSearchResults, visionPerformanceMode]);
}
