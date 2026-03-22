import { useState, useMemo } from "react";
import { TacticalMarker } from "../types";

export function useDiagnostics() {
  const [showGhostBrowser, setShowGhostBrowser] = useState(false);
  const [ghostBrowserUrl, setGhostBrowserUrl] = useState("");
  const [showGeoTactical, setShowGeoTactical] = useState(false);
  const [tacticalMarkers, setTacticalMarkers] = useState<TacticalMarker[]>([]);
  const [trackingTarget, setTrackingTarget] = useState("UNKNOWN");

  return useMemo(() => ({
    showGhostBrowser,
    setShowGhostBrowser,
    ghostBrowserUrl,
    setGhostBrowserUrl,
    showGeoTactical,
    setShowGeoTactical,
    tacticalMarkers,
    setTacticalMarkers,
    trackingTarget,
    setTrackingTarget,
  }), [showGhostBrowser, ghostBrowserUrl, showGeoTactical, tacticalMarkers, trackingTarget]);
}
