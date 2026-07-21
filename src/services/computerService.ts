// Service for Computer Access via Cortex (Python Backend)
// Handles Keyboard, Mouse (Advanced), and AppleScript

import {
  fetchCortexViaRuntimeFacade,
  postCortexJsonViaRuntimeFacade,
} from "./local-models/cortexRuntimeOps";

export const computerService = {
  // 1. Keyboard Input (Typing)
  typeText: async (text: string, interval = 0.05) => {
    try {
      // Cortex Phase 4c: facade base URL (not raw CORTEX_URL).
      const res = await fetchCortexViaRuntimeFacade("/keyboard/type", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, interval }),
        timeoutMs: 15_000,
      });
      return res.ok;
    } catch (e) {
      console.error("[COMPUTER] Type Failed:", e);
      return false;
    }
  },

  // 2. Keyboard Press (Hotkeys)
  pressKey: async (keys: string[]) => {
    try {
      const res = await fetchCortexViaRuntimeFacade("/keyboard/press", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys }),
        timeoutMs: 15_000,
      });
      return res.ok;
    } catch (e) {
      console.error("[COMPUTER] Press Failed:", e);
      return false;
    }
  },

  // 3. AppleScript (Mac Automation)
  runAppleScript: async (script: string) => {
    try {
      const data = await postCortexJsonViaRuntimeFacade<{
        status?: string;
        message?: string;
        output?: string;
      }>("/system/applescript", { script }, { timeoutMs: 30_000 });
      if (data.status === "error") throw new Error(data.message);
      return data.output || "Script Executed.";
    } catch (e: any) {
      console.error("[COMPUTER] AppleScript Failed:", e);
      return `Error: ${e.message}`;
    }
  },
};
