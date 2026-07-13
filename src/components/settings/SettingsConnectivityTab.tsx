import React, { useState } from "react";
import { Icon } from "../ui/Icon";

interface SettingsConnectivityTabProps {
  isMobile?: boolean;
}

const SettingsConnectivityTab: React.FC<SettingsConnectivityTabProps> = ({ isMobile }) => {
  const [copied, setCopied] = useState(false);
  const [bridgeStatus] = useState("active");
  const [mode, setMode] = useState<"stdio" | "sse">("stdio");

  const sseUrl = "http://127.0.0.1:8000/mcp/sse";

  const mcpConfig = JSON.stringify(
    {
      mcpServers: {
        luca: {
          command: "python3",
          args: [
            "/Users/macking/Downloads/kaleido/luca/cortex/python/mcp_bridge.py",
          ],
        },
      },
    },
    null,
    2,
  );

  const copyToClipboard = () => {
    navigator.clipboard.writeText(mcpConfig);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`space-y-6 ${isMobile ? "px-0" : ""}`}>
      {/* Header Info */}
      <div
        className={`flex items-center gap-4 p-5 transition-all ${isMobile ? "border-x-0 border-y rounded-none bg-[var(--luca-surface-glass)]" : "rounded-lg bg-[var(--app-bg-tint)] shadow-sm"} glass-blur`}
      >
        <div className="flex-1 min-w-0">
          <h4
            className="text-[15px] font-semibold flex items-center gap-2 mb-1 text-[var(--app-text-main)]"
          >
            <Icon name="Plug" variant="BoldDuotone" className="w-4 h-4 text-[var(--app-text-main)] opacity-80" />
            Luca Capability Sharing
          </h4>
          <p
            className={`text-xs text-[var(--app-text-muted)] max-w-md opacity-60 italic`}
          >
            Expose approved Luca capabilities to external AI apps through MCP. Use this advanced bridge only with tools you trust.
          </p>
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-medium border transition-all ${
            bridgeStatus === "active"
              ? "bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)] text-[var(--luca-success,#4fbf7a)] border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)] shadow-[0_0_10px_rgba(34,197,94,0.1)]"
              : "bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] text-[var(--luca-danger,#f87171)] border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)]"
          }`}
        >
          <Icon name="Activity" className={`w-3 h-3 ${bridgeStatus === "active" ? "animate-pulse" : ""}`} />
          {bridgeStatus}
        </div>
      </div>

      {/* Mode Selector */}
      <div
        className={`flex gap-1.5 p-1.5 self-start transition-all ${isMobile ? "mx-4 bg-[var(--luca-surface-glass)] border-none" : "rounded-lg bg-[var(--luca-surface-glass)]"} glass-blur shadow-inner`}
      >
        <button
          onClick={() => setMode("stdio")}
          className={`px-5 py-2 rounded-lg text-[10px] font-medium transition-all duration-300 border ${mode === "stdio" ? "bg-[var(--luca-surface-hover)] text-[var(--app-text-main)] border-[var(--app-border-main)] shadow-sm" : "bg-transparent text-[var(--app-text-muted)] border-transparent hover:text-[var(--app-text-main)] opacity-60 hover:opacity-100"}`}
        >
          Direct (STDIO)
        </button>
        <button
          onClick={() => setMode("sse")}
          className={`px-5 py-2 rounded-lg text-[10px] font-medium transition-all duration-300 border ${mode === "sse" ? "bg-[var(--luca-surface-hover)] text-[var(--app-text-main)] border-[var(--app-border-main)] shadow-sm" : "bg-transparent text-[var(--app-text-muted)] border-transparent hover:text-[var(--app-text-main)] opacity-60 hover:opacity-100"}`}
        >
          Production (SSE)
        </button>
      </div>

      {/* Connection Guide */}
      <div className="space-y-4">
        <h5 className={`text-[10px] text-[var(--app-text-muted)] font-medium opacity-60 ${isMobile ? "px-4" : ""}`}>
          1. Configure External Apps
        </h5>

        {mode === "stdio" ? (
          <div
            className={`overflow-hidden transition-all ${isMobile ? "border-x-0 border-y rounded-none bg-[var(--luca-surface-glass)]" : "rounded-lg bg-[var(--app-bg-tint)] border-[var(--app-border-main)]"} glass-blur shadow-lg`}
          >
            <div
              className={`flex items-center justify-between px-5 py-3 border-b border-[var(--app-border-main)] bg-[var(--luca-surface-glass)] opacity-90`}
            >
              <div className="flex items-center gap-2">
                <Icon name="FileCode" className="w-4 h-4 text-[var(--app-text-muted)] opacity-60" />
                <span className="text-xs font-mono text-[var(--app-text-muted)] opacity-80">
                  claude_desktop_config.json
                </span>
              </div>
              <button
                onClick={copyToClipboard}
                className={`flex items-center gap-2 text-[10px] font-medium transition-all text-[var(--app-text-muted)] hover:text-[var(--app-text-main)]`}
              >
                {copied ? (
                  <Icon name="Check" className="w-3.5 h-3.5 text-[var(--luca-success,#4fbf7a)]" />
                ) : (
                  <Icon name="Copy" className="w-3.5 h-3.5" />
                )}
                {copied ? "Copied!" : "Copy Config"}
              </button>
            </div>
            <pre
              className={`p-5 text-xs font-mono overflow-x-auto text-[var(--app-text-main)] bg-[var(--luca-surface-glass)] leading-relaxed`}
            >
              {mcpConfig}
            </pre>
          </div>
        ) : (
          <div
            className={`overflow-hidden p-8 text-center space-y-6 transition-all ${isMobile ? "border-x-0 border-y rounded-none bg-[var(--luca-surface-glass)]" : "rounded-lg bg-[var(--app-bg-tint)] border-[var(--app-border-main)] shadow-lg"} glass-blur`}
          >
            <div className="space-y-3">
              <h6
                className={`text-xs font-medium text-[var(--app-text-main)] opacity-60`}
              >
                SSE Connection URL
              </h6>
              <div
                className={`w-full max-w-md mx-auto flex items-center justify-between bg-[var(--luca-surface-solid)] rounded-lg py-1.5 pl-4 pr-2 font-mono text-xs shadow-inner group transition-all hover:border-[var(--app-text-muted)]`}
              >
                <span
                  className={`text-[var(--app-text-main)] font-bold truncate`}
                >
                  {sseUrl}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sseUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="p-2 hover:bg-[var(--luca-surface-hover)] rounded-lg transition-all text-[var(--app-text-muted)] hover:text-[var(--app-text-main)]"
                >
                  {copied ? (
                    <Icon name="Check" className="w-5 h-5 text-[var(--luca-success,#4fbf7a)]" />
                  ) : (
                    <Icon name="Copy" className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            <p className="text-xs text-[var(--app-text-muted)] opacity-60 leading-relaxed italic">
              In SSE mode, you just paste this URL into apps like{" "}
              <strong className="text-[var(--app-text-main)]">Cursor</strong> or <strong className="text-[var(--app-text-main)]">MCP Inspector</strong>.
            </p>
          </div>
        )}
      </div>

      {/* Path Helper */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${isMobile ? "gap-0" : "gap-4"}`}>
        <div
          className={`p-5 space-y-3 transition-all ${isMobile ? "border-x-0 border-b rounded-none bg-[var(--luca-surface-glass)]" : "rounded-lg bg-[var(--app-bg-tint)] border-[var(--app-border-main)] shadow-sm"} glass-blur`}
        >
          <div
            className={`flex items-center gap-2 text-xs font-medium text-[var(--app-text-main)] opacity-60`}
          >
            <Icon name="Terminal" variant="BoldDuotone" className="w-4 h-4 text-[var(--app-text-main)]" />
            Local Bridge Command
          </div>
          <p
            className={`text-[11px] font-mono break-all p-3 rounded-lg bg-[var(--luca-surface-solid)] text-[var(--app-text-muted)] leading-relaxed shadow-inner`}
          >
            python3
            /Users/macking/Downloads/kaleido/luca/cortex/python/mcp_bridge.py
          </p>
        </div>
        <div
          className={`p-5 space-y-3 transition-all ${isMobile ? "border-x-0 border-b rounded-none bg-[var(--luca-surface-glass)]" : "rounded-lg bg-[var(--app-bg-tint)] border-[var(--app-border-main)] shadow-sm"} glass-blur`}
        >
          <div
            className={`flex items-center gap-2 text-xs font-medium text-[var(--app-text-main)] opacity-60`}
          >
            <Icon name="Shield" variant="BoldDuotone" className="w-4 h-4 text-[var(--app-text-main)]" />
            Access Scope
          </div>
          <div
            className={`text-sm text-[var(--app-text-muted)] leading-relaxed opacity-80`}
          >
            Bridge access is currently in{" "}
            <span
              className={`text-[var(--app-text-main)] font-medium`}
            >
              Direct local mode
            </span>
            . Approved external apps can access the local memory bridge according to the configured MCP scope.
          </div>
        </div>
      </div>

      {/* External Links */}
      <div className={`pt-6 border-t border-[var(--app-border-main)] flex flex-wrap gap-6 ${isMobile ? "px-4" : ""}`}>
        <button
          onClick={() =>
            window.open("https://modelcontextprotocol.io", "_blank")
          }
          className={`flex items-center gap-2 text-[10px] font-medium transition-all text-[var(--app-text-muted)] hover:text-[var(--app-text-main)] opacity-60 hover:opacity-100 group`}
        >
          <Icon name="ExternalLink" className="w-3.5 h-3.5" />
          <span>View Protocol Docs</span>
        </button>
        <button
          onClick={() => {
            console.log(
              "Opening Config Folder is currently disabled on this widget.",
            );
          }}
          className={`flex items-center gap-2 text-[10px] font-medium transition-all text-[var(--app-text-muted)] hover:text-[var(--app-text-main)] opacity-60 hover:opacity-100 group`}
        >
          <Icon name="Settings" className="w-3.5 h-3.5" />
          <span>Open Config Folder</span>
        </button>
      </div>
    </div>
  );
};

export default SettingsConnectivityTab;
