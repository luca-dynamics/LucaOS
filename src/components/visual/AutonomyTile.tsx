import React, { useState, useEffect } from "react";

const AutonomyTile: React.FC = () => {
  const [status, setStatus] = useState<"IDLE" | "THINKING" | "EXECUTING">(
    "IDLE"
  );
  const [logs, setLogs] = useState<
    { msg: string; type: "thought" | "tool" | "status" }[]
  >([]);

  useEffect(() => {
    // @ts-ignore
    const handleAutonomyUpdate = (event: any) => {
      const data = event.detail;

      if (data.type === "thought") {
        setStatus("THINKING");
        setLogs((prev) =>
          [
            ...prev,
            { msg: data.payload.message, type: "thought" as const },
          ].slice(-10)
        );
      } else if (data.type === "tool_call") {
        setStatus("EXECUTING");
        setLogs((prev) =>
          [
            ...prev,
            { msg: `Tool: ${data.payload.tool}`, type: "tool" as const },
          ].slice(-10)
        );
      } else if (data.type === "status") {
        setLogs((prev) =>
          [
            ...prev,
            { msg: `Status: ${data.payload.state}`, type: "status" as const },
          ].slice(-10)
        );
      }
    };

    window.addEventListener("autonomy-update", handleAutonomyUpdate);
    return () =>
      window.removeEventListener("autonomy-update", handleAutonomyUpdate);
  }, []);

  return (
    <div className="p-4 flex flex-col h-full bg-black/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              status === "IDLE" ? "bg-slate-500" : "bg-[color-mix(in_srgb,var(--luca-accent-primary,#9b7cff)_12%,transparent)] animate-pulse"
            }`}
          />
          <span className="text-xs font-mono text-[var(--luca-accent-primary,#9b7cff)]">{status}</span>
        </div>
        <div className="text-[10px] font-mono text-slate-500">
          LIFELOOP v1.0
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 font-mono text-[10px]">
        {logs.length === 0 && (
          <div className="text-slate-600 italic">Luca interface standby...</div>
        )}

        {logs.map((log, i) => (
          <div
            key={i}
            className={`
                        p-2 rounded border-l-2
                        ${
                          log.type === "thought"
                            ? "border-[color-mix(in_srgb,var(--luca-accent-primary,#9b7cff)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-accent-primary,#9b7cff)_12%,transparent)] text-[var(--luca-accent-primary,#9b7cff)]"
                            : ""
                        }
                        ${
                          log.type === "tool"
                            ? "border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)] text-[var(--luca-warning,#f2b23e)]"
                            : ""
                        }
                        ${
                          log.type === "status"
                            ? "border-[color-mix(in_srgb,var(--luca-info,#4f8cff)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)] text-[var(--luca-info,#4f8cff)]"
                            : ""
                        }
                    `}
          >
            {log.msg}
          </div>
        ))}
        <div id="autonomy-anchor" />
      </div>
    </div>
  );
};

export default AutonomyTile;
