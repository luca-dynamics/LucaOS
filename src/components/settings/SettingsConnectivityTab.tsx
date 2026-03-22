import React, { useState } from "react";
import * as LucideIcons from "lucide-react";
const {
  Plug,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  Shield,
  Activity,
  Settings,
} = LucideIcons as any;

interface SettingsConnectivityTabProps {
  theme: {
    primary: string;
    hex: string;
    themeName: string;
  };
}

const SettingsConnectivityTab: React.FC<SettingsConnectivityTabProps> = ({
  theme,
}) => {
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
    <div className="space-y-6">
      {/* Header Info */}
      <div
        className={`flex items-center justify-between p-4 rounded-xl border ${theme.themeName?.toLowerCase() === "lucagent" ? "glass-panel-light border-black/10 shadow-sm" : "backdrop-blur-sm bg-white/5 border-white/10"}`}
        style={{
          backgroundColor:
            theme.themeName?.toLowerCase() === "lucagent" ? undefined : `${theme.hex}0d`,
          borderColor:
            theme.themeName?.toLowerCase() === "lucagent" ? undefined : `${theme.hex}33`,
        }}
      >
        <div className="space-y-1">
          <h4
            className="text-sm font-bold flex items-center gap-2"
            style={{ color: theme.hex }}
          >
            <Plug className="w-4 h-4" />
            LUCA MCP
          </h4>
          <p
            className={`text-[10px] ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-600 font-bold" : "text-gray-500"} max-w-md`}
          >
            Connect Luca to external AI agents. Memory access now, more
            capabilities coming soon.
          </p>
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold ${
            bridgeStatus === "active"
              ? theme.themeName?.toLowerCase() === "lucagent"
                ? "bg-green-500/10 text-green-700 border border-green-500/20"
                : "bg-green-500/20 text-green-400"
              : theme.themeName?.toLowerCase() === "lucagent"
                ? "bg-red-500/10 text-red-700 border border-red-500/20"
                : "bg-red-500/20 text-red-400"
          }`}
        >
          <Activity className="w-3 h-3" />
          {bridgeStatus.toUpperCase()}
        </div>
      </div>

      {/* Mode Selector */}
      <div
        className={`flex gap-2 p-1 rounded-lg border self-start ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.03] border-black/10" : "bg-black/20 border-white/5"}`}
      >
        <button
          onClick={() => setMode("stdio")}
          className={`px-4 py-1.5 rounded-md text-[10px] font-bold transition-all ${mode === "stdio" ? (theme.themeName?.toLowerCase() === "lucagent" ? "bg-white text-slate-900 shadow-sm border border-black/10" : "bg-white/10 text-white shadow-sm") : "text-gray-500 hover:text-gray-300"}`}
          style={
            mode === "stdio" && theme.themeName !== "lucagent"
              ? { border: `1px solid ${theme.hex}33` }
              : {}
          }
        >
          DIRECT (STDIO)
        </button>
        <button
          onClick={() => setMode("sse")}
          className={`px-4 py-1.5 rounded-md text-[10px] font-bold transition-all ${mode === "sse" ? (theme.themeName?.toLowerCase() === "lucagent" ? "bg-white text-slate-900 shadow-sm border border-black/10" : "bg-white/10 text-white shadow-sm") : "text-gray-500 hover:text-gray-300"}`}
          style={
            mode === "sse" && theme.themeName !== "lucagent"
              ? { border: `1px solid ${theme.hex}33` }
              : {}
          }
        >
          PRODUCTION (SSE)
        </button>
      </div>

      {/* Connection Guide */}
      <div className="space-y-4">
        <h5 className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
          1. Configure External Apps
        </h5>

        {mode === "stdio" ? (
          <div
            className={`rounded-xl border overflow-hidden ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-white border-black/10" : "bg-black/40 border-white/5"}`}
          >
            <div
              className={`flex items-center justify-between px-4 py-2 border-b ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.02] border-black/5" : "bg-white/5 border-white/5"}`}
            >
              <span className="text-[10px] font-mono text-gray-400">
                claude_desktop_config.json
              </span>
              <button
                onClick={copyToClipboard}
                className={`flex items-center gap-1.5 text-[10px] transition-colors ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-500 hover:text-slate-900" : "text-gray-400 hover:text-white"}`}
              >
                {copied ? (
                  <Check className="w-3 h-3 text-green-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copied ? "Copied!" : "Copy Config"}
              </button>
            </div>
            <pre
              className={`p-4 text-[11px] font-mono overflow-x-auto ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-800" : "text-gray-300"}`}
            >
              {mcpConfig}
            </pre>
          </div>
        ) : (
          <div
            className={`rounded-xl border overflow-hidden p-6 text-center space-y-4 ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-white border-black/10" : "bg-black/40 border-white/5"}`}
          >
            <div className="space-y-2">
              <h6
                className={`text-xs ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-900 font-bold" : "text-gray-300"}`}
              >
                SSE Connection URL
              </h6>
              <div
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.03] border-black/5" : "bg-black/50 border-white/5"}`}
              >
                <span
                  className={`text-sm font-mono ${theme.themeName?.toLowerCase() === "lucagent" ? "text-indigo-600 font-bold" : "text-green-400"}`}
                >
                  {sseUrl}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sseUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="p-1 hover:bg-white/10 rounded"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-gray-500">
              In SSE mode, you just paste this URL into apps like{" "}
              <strong>Cursor</strong> or <strong>MCP Inspector</strong>. No
              Python script paths required.
            </p>
          </div>
        )}
      </div>

      {/* Path Helper */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className={`p-4 rounded-xl border space-y-2 ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-white border-black/10" : "border-white/5 bg-white/5"}`}
        >
          <div
            className={`flex items-center gap-2 text-xs font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-900" : "text-gray-300"}`}
          >
            <Terminal className="w-3 h-3" style={{ color: theme.hex }} />
            Local Command
          </div>
          <p
            className={`text-[10px] font-mono break-all p-2 rounded ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.03] text-slate-700" : "bg-black/30 text-gray-500"}`}
          >
            python3
            /Users/macking/Downloads/kaleido/luca/cortex/python/mcp_bridge.py
          </p>
        </div>
        <div
          className={`p-4 rounded-xl border space-y-2 ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-white border-black/10" : "border-white/5 bg-white/5"}`}
        >
          <div
            className={`flex items-center gap-2 text-xs font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-900" : "text-gray-300"}`}
          >
            <Shield className="w-3 h-3" style={{ color: theme.hex }} />
            Security Mode
          </div>
          <p
            className={`text-[10px] ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-700 font-bold" : "text-gray-500"}`}
          >
            Bridge is currently in{" "}
            <span
              className={`${theme.themeName?.toLowerCase() === "lucagent" ? "text-indigo-600" : "text-white"} italic`}
            >
              Direct Mode
            </span>
            . External apps have full read/write access to your local SQLite
            memory.
          </p>
        </div>
      </div>

      {/* External Links */}
      <div className="pt-4 border-t border-white/5 flex gap-4">
        <button
          onClick={() =>
            window.open("https://modelcontextprotocol.io", "_blank")
          }
          className={`flex items-center gap-2 text-[10px] transition-colors ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-500 hover:text-slate-900 font-bold" : "text-gray-500 hover:text-white"}`}
        >
          <ExternalLink className="w-3 h-3" style={{ color: theme.hex }} />
          View MCP Protocol Docs
        </button>
        <button
          onClick={() => {
            // Use Electron shell to open folder in Finder
            // if (window.require) {
            // const { shell } = window.require("electron");
            // const path = window.require("path");
            // const os = window.require("os");
            // const configPath = path.join(
            //   os.homedir(),
            //   "Library",
            //   "Application Support",
            //   "Claude",
            // );
            // shell.openPath(configPath);
            console.log(
              "Opening Config Folder is currently disabled on this widget.",
            );
            // }
          }}
          className={`flex items-center gap-2 text-[10px] transition-colors ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-500 hover:text-slate-900 font-bold" : "text-gray-500 hover:text-white"}`}
        >
          <Settings className="w-3 h-3" style={{ color: theme.hex }} />
          Open Claude Config Folder
        </button>
      </div>
    </div>
  );
};

export default SettingsConnectivityTab;
