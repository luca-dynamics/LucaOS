import { createContext, useContext, useMemo, type ReactNode } from "react";
import { detectBrowserHostCapabilities, type BrowserCapabilityMap } from "./browserHostCapabilities";
import { detectWebHostClass, type WebHostClass } from "./hostClass";
import { buildWebCapabilityGraph, type WebCapabilityGraph } from "./webCapabilityGraph";

export type WebLucaLinkStatus = "not-paired" | "ready-to-pair" | "connector-required";

export interface WebRuntimeContextValue {
  selectedEntry: "webBridgeEntry";
  hostClass: WebHostClass;
  browserCapabilities: BrowserCapabilityMap;
  nativeCapabilityGuards: WebCapabilityGraph;
  lucaLinkStatus: WebLucaLinkStatus;
  webRuntimeLevel: "browser-host";
}

const WebRuntimeContext = createContext<WebRuntimeContextValue | null>(null);
const configured = (value: unknown) => typeof value === "string" && value.trim().length > 0;

export function WebRuntimeProvider({ children }: { children: ReactNode }) {
  const value = useMemo<WebRuntimeContextValue>(() => {
    const hostClass = detectWebHostClass();
    const cloudConfigured = configured(import.meta.env.VITE_LUCA_API_URL || import.meta.env.VITE_CLOUD_API_URL);
    const connectorConfigured = configured(import.meta.env.VITE_RELAY_SERVER_URL);
    return {
      selectedEntry: "webBridgeEntry",
      hostClass,
      browserCapabilities: detectBrowserHostCapabilities(hostClass),
      nativeCapabilityGuards: buildWebCapabilityGraph({
        cloudApiConfigured: cloudConfigured,
        webChatConfigured: configured(import.meta.env.VITE_LUCA_API_URL),
        lucaLinkConnectorConfigured: connectorConfigured,
      }),
      lucaLinkStatus: connectorConfigured ? "ready-to-pair" : "connector-required",
      webRuntimeLevel: "browser-host",
    };
  }, []);

  if (typeof window !== "undefined") window.__LUCA_DETECTED_HOST_CLASS__ = value.hostClass;
  return <WebRuntimeContext.Provider value={value}>{children}</WebRuntimeContext.Provider>;
}

export function useWebRuntime() {
  const value = useContext(WebRuntimeContext);
  if (!value) throw new Error("useWebRuntime must be used inside WebRuntimeProvider");
  return value;
}
