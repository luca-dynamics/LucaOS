import React, { useEffect, useRef, useState } from "react";
import {
  X,
  RefreshCw,
  ExternalLink,
  Maximize2,
  Minimize2,
  Home,
  ArrowLeft,
  ArrowRight,
  Brain,
} from "lucide-react";
import { apiUrl } from "../config/api";

interface Props {
  url: string;
  title?: string;
  onClose: () => void;
  onNavigate?: (url: string) => void;
  sessionId?: string; // Optional: Web Navigator session ID for agent overlay
  mode?: "STANDALONE" | "EMBEDDED"; // NEW: Support embedded mode
}

// Technical: Electron webview is not a standard HTML element in React's types.
// We use a global declaration to prevent TS errors while adhering to module standards.
// Webview is handled via type casting in the render block to avoid declaration conflicts.

const GhostBrowser: React.FC<Props> = ({
  url,
  title = "Ghost Browser",
  onClose,
  onNavigate,
  sessionId,
  mode = "STANDALONE",
}) => {
  const webviewRef = useRef<any>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(url);
  const [isLoading, setIsLoading] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);

  // Agent overlay state
  const [agentState, setAgentState] = useState<any>(null);
  const [showAgentOverlay, setShowAgentOverlay] = useState(false);
  const [highlightedElement, setHighlightedElement] = useState<number | null>(
    null
  );

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) {
      console.warn("[GhostBrowser] Webview ref not found on mount");
      return;
    }

    console.log("[GhostBrowser] Attaching listeners to webview");

    const handleDidStartLoading = () => {
      console.log("[GhostBrowser] did-start-loading");
      setIsLoading(true);
    };

    const handleDidStopLoading = () => {
      console.log("[GhostBrowser] did-stop-loading");
      setIsLoading(false);
    };

    const handleDidNavigate = (e: any) => {
      const navUrl = e.url;
      console.log("[GhostBrowser] did-navigate:", navUrl);
      setCurrentUrl(navUrl);

      // Update canGoBack/forward
      if (webview.canGoBack) setCanGoBack(webview.canGoBack());
      if (webview.canGoForward) setCanGoForward(webview.canGoForward());

      // Auto-close logic for authentication flows (Google, X, etc)
      if (
        navUrl.includes("/api/google/auth/callback") ||
        navUrl.includes("/auth/callback") ||
        navUrl.includes("/auth/success") ||
        navUrl.includes("x.com/home") ||
        navUrl.includes("twitter.com/home")
      ) {
        console.log(
          "[GhostBrowser] Auth callback URL detected, will close in 3s:",
          navUrl
        );
        setTimeout(() => {
          onClose();
        }, 5000); // 5s delay to allow user to see the success message and backend to finish
      }

      if (onNavigate) {
        onNavigate(navUrl);
      }
    };

    const handleDidFailLoad = (e: any) => {
      console.error(
        "[GhostBrowser] Webview load failed:",
        e.errorCode,
        e.errorDescription,
        "URL:",
        e.validatedURL
      );
      setIsLoading(false);
    };

    // Use dom-ready to know when we can safely call webview methods
    const handleDomReady = () => {
      console.log("[GhostBrowser] DOM ready, initial nav check");
      if (webview.canGoBack) setCanGoBack(webview.canGoBack());
      if (webview.canGoForward) setCanGoForward(webview.canGoForward());
    };

    webview.addEventListener("dom-ready", handleDomReady);
    webview.addEventListener("did-start-loading", handleDidStartLoading);
    webview.addEventListener("did-stop-loading", handleDidStopLoading);
    webview.addEventListener("did-navigate", handleDidNavigate);
    webview.addEventListener("did-navigate-in-page", handleDidNavigate);
    webview.addEventListener("did-fail-load", handleDidFailLoad);

    // Update navigation state periodically
    const navInterval = setInterval(() => {
      if (webview && typeof webview.canGoBack === "function") {
        setCanGoBack(webview.canGoBack());
        setCanGoForward(webview.canGoForward());
      }
    }, 1000);

    return () => {
      webview.removeEventListener("dom-ready", handleDomReady);
      webview.removeEventListener("did-start-loading", handleDidStartLoading);
      webview.removeEventListener("did-stop-loading", handleDidStopLoading);
      webview.removeEventListener("did-navigate", handleDidNavigate);
      webview.removeEventListener("did-navigate-in-page", handleDidNavigate);
      webview.removeEventListener("did-fail-load", handleDidFailLoad);
      clearInterval(navInterval);
    };
  }, [onClose, onNavigate]);

  // Agent state polling (if sessionId provided)
  useEffect(() => {
    if (!sessionId) return;

    const fetchAgentState = async () => {
      try {
        const res = await fetch(
          apiUrl(`/api/web/state?sessionId=${sessionId}`)
        );

        if (res.status === 404) {
          // Handled by clearInterval logic if necessary
          return;
        }

        const data = await res.json();
        if (data.state) {
          setAgentState(data.state);
          setShowAgentOverlay(true);

          if (data.state.agentData?.actionInput?.index !== undefined) {
            setHighlightedElement(data.state.agentData.actionInput.index);
            setTimeout(() => setHighlightedElement(null), 2000);
          }
        }
      } catch {
        // Suppress errors for cleaner console
      }
    };

    fetchAgentState();
    const interval = setInterval(fetchAgentState, 2000);

    return () => clearInterval(interval);
  }, [sessionId]);

  const handleGoBack = () => {
    webviewRef.current?.goBack();
  };

  const handleGoForward = () => {
    webviewRef.current?.goForward();
  };

  const handleRefresh = () => {
    webviewRef.current?.reload();
  };

  const handleGoHome = () => {
    webviewRef.current?.loadURL(url);
  };

  const handleOpenExternal = () => {
    if (typeof window !== "undefined" && (window as any).electron) {
      (window as any).electron.shell.openExternal(currentUrl);
    }
  };

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  if (mode === "EMBEDDED") {
    // NOTE: themeHex is not defined in the provided context. Assuming it's defined elsewhere or will be added.
    const themeHex = "#06b6d4"; // Placeholder for themeHex
    return (
      <div className="w-full h-full bg-[#0d0d0d] flex flex-col overflow-hidden">
        <div className="flex-1 relative bg-black flex flex-col items-center justify-center overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4">
                <div
                  className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: `${themeHex} transparent` }}
                ></div>
                <div
                  className="text-xs font-black tracking-widest uppercase animate-pulse"
                  style={{ color: themeHex }}
                >
                  Synchronizing Luca Link...
                </div>
              </div>
            </div>
          )}

          {showAgentOverlay && (
            <div className="absolute inset-0 z-30 pointer-events-none">
              {highlightedElement !== null && (
                <div className="absolute inset-0 bg-transparent">
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-cyan-500/90 text-black px-4 py-2 rounded-full font-bold shadow-[0_0_20px_rgba(6,182,212,0.6)] animate-bounce">
                    Targeting Element #{highlightedElement}
                  </div>
                </div>
              )}

              {agentState.reasoning && (
                <div className="absolute bottom-8 left-8 right-8 bg-black/80 border border-purple-500/50 p-4 rounded-xl backdrop-blur-md shadow-2xl pointer-events-auto max-h-[30vh] overflow-y-auto">
                  <div className="flex items-start gap-3">
                    <Brain
                      className="text-purple-400 shrink-0 mt-1"
                      size={20}
                    />
                    <div className="flex-1">
                      <h4 className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-1">
                        Agent Reasoning
                      </h4>
                      <p className="text-sm text-slate-200 leading-relaxed font-sans">
                        {agentState.reasoning}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <webview
            ref={webviewRef}
            src={url}
            style={{ width: "100%", height: "100%" }}
            {...({
              partition: "persist:luca",
              allowpopups: "true",
              webpreferences: "nodeIntegration=no,contextIsolation=yes",
            } as any)}
          />
        </div>

        <div className="h-6 border-t border-cyan-900/30 bg-[#080808] px-4 flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-4">
            <span>BROWSER</span>
            <span className="text-cyan-400">ACTIVE</span>
            {sessionId && (
              <>
                <span className="text-cyan-500">|</span>
                <span className="text-cyan-400">AGENT MODE</span>
                {agentState && (
                  <span className="text-slate-400">
                    STEP {agentState.iteration}/{agentState.maxIterations}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span>ENGINE: WEBVIEW</span>
            <span>MODE: {mode}</span>
          </div>
        </div>
      </div>
    );
  }

  // NOTE: themeHex is not defined in the provided context. Assuming it's defined elsewhere or will be added.
  const themeHex = "#06b6d4"; // Placeholder for themeHex
  return (
    <div
      className={`fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200 font-mono ${
        isMaximized ? "p-0" : "p-4 sm:p-20"
      }`}
    >
      <div className="relative w-full h-full bg-[#0d0d0d] flex flex-col overflow-hidden border border-cyan-500/30 shadow-2xl rounded-lg">
        <div className="h-14 border-b border-cyan-900/50 bg-cyan-950/10 flex items-center justify-between px-4 z-10 drag-handle">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <button
                onClick={handleGoBack}
                disabled={!canGoBack}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Go Back"
              >
                <ArrowLeft size={16} />
              </button>
              <button
                onClick={handleGoForward}
                disabled={!canGoForward}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Go Forward"
              >
                <ArrowRight size={16} />
              </button>
              <button
                onClick={handleRefresh}
                className="p-1.5 text-slate-400 hover:text-white transition-colors"
                title="Refresh"
              >
                <RefreshCw
                  size={16}
                  className={isLoading ? "animate-spin" : ""}
                />
              </button>
              <button
                onClick={handleGoHome}
                className="p-1.5 text-slate-400 hover:text-white transition-colors"
                title="Home"
              >
                <Home size={16} />
              </button>
            </div>

            <div className="flex-1 mx-4 min-w-0">
              <div className="bg-black/40 border border-cyan-900/30 rounded px-3 py-1.5 flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isLoading ? "bg-cyan-500 animate-pulse" : "bg-green-500"
                  }`}
                ></div>
                <input
                  type="text"
                  value={currentUrl}
                  onChange={(e) => setCurrentUrl(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      webviewRef.current?.loadURL(currentUrl);
                    }
                  }}
                  className="flex-1 bg-transparent text-xs text-white outline-none font-mono"
                  placeholder="Enter URL..."
                />
              </div>
            </div>
            <div className="text-xs text-cyan-400 font-bold tracking-widest truncate max-w-[200px]">
              {title}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenExternal}
              className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors"
              title="Open in External Browser"
            >
              <ExternalLink size={16} />
            </button>
            <button
              onClick={handleMaximize}
              className="p-1.5 text-slate-400 hover:text-white transition-colors"
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 relative bg-black flex flex-col items-center justify-center overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4">
                <div
                  className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: `${themeHex} transparent` }}
                ></div>
                <div
                  className="text-xs font-black tracking-widest uppercase animate-pulse"
                  style={{ color: themeHex }}
                >
                  Synchronizing Luca Link...
                </div>
              </div>
            </div>
          )}

          {showAgentOverlay && (
            <div className="absolute inset-0 z-30 pointer-events-none">
              {highlightedElement !== null && (
                <div className="absolute inset-0 bg-transparent">
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-cyan-500/90 text-black px-4 py-2 rounded-full font-bold shadow-[0_0_20px_rgba(6,182,212,0.6)] animate-bounce">
                    Targeting Element #{highlightedElement}
                  </div>
                </div>
              )}

              {agentState.reasoning && (
                <div className="absolute bottom-8 left-8 right-8 bg-black/80 border border-purple-500/50 p-4 rounded-xl backdrop-blur-md shadow-2xl pointer-events-auto max-h-[30vh] overflow-y-auto">
                  <div className="flex items-start gap-3">
                    <Brain
                      className="text-purple-400 shrink-0 mt-1"
                      size={20}
                    />
                    <div className="flex-1">
                      <h4 className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-1">
                        Agent Reasoning
                      </h4>
                      <p className="text-sm text-slate-200 leading-relaxed font-sans">
                        {agentState.reasoning}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <webview
            ref={webviewRef}
            src={url}
            style={{ width: "100%", height: "100%" }}
            {...({
              partition: "persist:luca",
              allowpopups: "true",
              webpreferences: "nodeIntegration=no,contextIsolation=yes",
            } as any)}
          />
        </div>

        <div className="h-6 border-t border-cyan-900/30 bg-[#080808] px-4 flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-4">
            <span>LUCA BROWSER</span>
            <span className="text-cyan-400">ACTIVE</span>
            {sessionId && (
              <>
                <span className="text-cyan-500">|</span>
                <span className="text-cyan-400">AGENT MODE</span>
                {agentState && (
                  <span className="text-slate-400">
                    STEP {agentState.iteration}/{agentState.maxIterations}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span>ENGINE: WEBVIEW</span>
            <span>MODE: {mode}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GhostBrowser;
