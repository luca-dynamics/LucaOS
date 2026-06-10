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
import PublicWebShell from "./components/web/PublicWebShell";
import {
  isPublicWebQueryModeBlocked,
  readCurrentWebAccessPolicy,
  shouldRenderPublicWebShell,
} from "./config/webAccessPolicy";
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
const requestedMode = params.get("mode");
const webAccessPolicy = readCurrentWebAccessPolicy();
const renderPublicWebShell = shouldRenderPublicWebShell(webAccessPolicy);

// Temporary public preview gate for app.lucaos.space until API/auth/session
// boundaries exist. In web/vercel mode this must win before query-param
// surfaces such as ?mode=widget, ?mode=hologram, ?mode=mobile, or ?mode=tv.
if (isPublicWebQueryModeBlocked(requestedMode, webAccessPolicy)) {
  console.warn(
    `[BOOT] Public web access policy blocked query mode: ${requestedMode}`,
  );
}

const canUseQueryMode = !renderPublicWebShell;
const isWidgetMode = canUseQueryMode && requestedMode === "widget";
const isChatMode = canUseQueryMode && requestedMode === "chat";
const isHologramMode = canUseQueryMode && requestedMode === "hologram";
const isMobileMode = canUseQueryMode && requestedMode === "mobile";
const isTvMode = canUseQueryMode && requestedMode === "tv";

const root = ReactDOM.createRoot(rootElement);
root.render(
  // <React.StrictMode>
  <SystemErrorBoundary>
    <style>{generateThemeStyles()}</style>
    {renderPublicWebShell ? (
      <PublicWebShell policy={webAccessPolicy} />
    ) : isWidgetMode ? (
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
