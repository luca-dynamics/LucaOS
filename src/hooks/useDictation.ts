import { useState } from "react";

export const useDictation = () => {
  const [isDictating, setIsDictating] = useState(false);

  const sendDictationMode = (active: boolean) => {
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.send("widget-toggle-voice", {
        mode: active ? "DICTATION" : "OFF",
      });
    }
  };

  const toggleDictation = () => {
    const newState = !isDictating;
    setIsDictating(newState);
    sendDictationMode(newState);
  };

  const setDictationState = (active: boolean, notifyMain = false) => {
    setIsDictating(active);
    if (notifyMain) sendDictationMode(active);
  };

  return { isDictating, toggleDictation, setDictationState };
};
