import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import SystemErrorBoundary from "./components/SystemErrorBoundary";
import { isElectron } from "./utils/env";

import WidgetMode from "./components/WidgetMode";
import ChatWidgetMode from "./components/ChatWidgetMode"; // Import Chat Mode
import MobileCastReceiver from "./components/MobileCastReceiver";
import TVReceiver from "./components/TVReceiver";
import HologramMode from "./components/HologramMode";
import { generateThemeStyles } from "./config/themeColors";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

console.log("[BOOT] Environment Check - isElectron:", isElectron(), "URL Params:", window.location.search);

// Initialize background only if truly on web. 
// Electron uses transparency/liquid background handled by App.tsx.
// Moved to App.tsx useEffect for more reliable cleanup.

const params = new URLSearchParams(window.location.search);
const isWidgetMode = params.get("mode") === "widget";
const isChatMode = params.get("mode") === "chat";
const isHologramMode = params.get("mode") === "hologram";
const isMobileMode = params.get("mode") === "mobile";
const isTvMode = params.get("mode") === "tv";

const root = ReactDOM.createRoot(rootElement);
root.render(
  // <React.StrictMode>
  <SystemErrorBoundary>
    <style>{generateThemeStyles()}</style>
    {isWidgetMode ? (
      <WidgetMode />
    ) : isChatMode ? (
      <ChatWidgetMode />
    ) : isHologramMode ? ( // New Route
      <HologramMode />
    ) : isMobileMode ? (
      <MobileCastReceiver />
    ) : isTvMode ? (
      <TVReceiver />
    ) : (
      <App />
    )}
  </SystemErrorBoundary>,
  // </React.StrictMode>
);

// Remove the native splash loader once hydration begins
const loader = document.getElementById("root-loader");
if (loader) {
  loader.style.opacity = "0";
  setTimeout(() => loader.remove(), 500);
}
