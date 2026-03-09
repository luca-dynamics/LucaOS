import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import SystemErrorBoundary from "./components/SystemErrorBoundary";

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

// Web mode: Force opaque background on body/html to prevent browser white bleed-through.
// On Electron, body stays transparent (needed for native window transparency).
const isElectron = !!(window as any).electron;
if (!isElectron) {
  // We set a neutral dark background initially. React components will overlay their specific theme colors.
  document.documentElement.style.backgroundColor = "#1c1c1c";
  document.body.style.backgroundColor = "#1c1c1c";
}

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
