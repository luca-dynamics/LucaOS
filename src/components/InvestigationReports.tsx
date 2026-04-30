import React, { useState, useEffect } from "react";
import { Icon } from "./ui/Icon";
import { settingsService } from "../services/settingsService";
import { getThemeColors } from "../config/themeColors";
import { apiUrl } from "../config/api";

interface InvestigationReport {
  file: string;
  target: string;
  timestamp: number;
  riskScore: number;
  resultCount: number;
  summary?: string;
  enginesUsed?: string[];
  severity?: string;
}

interface Props {
  onClose: () => void;
  theme?: any;
}

const InvestigationReports: React.FC<Props> = ({ onClose, theme: propTheme }) => {
  const [reports, setReports] = useState<InvestigationReport[]>([]);
  const [selectedReport, setSelectedReport] =
    useState<InvestigationReport | null>(null);
  const [reportDetails, setReportDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [exportFormat, setExportFormat] = useState<"json" | "markdown">(
    "markdown"
  );
  const [isReconMode, setIsReconMode] = useState(false);
  const [reconTarget, setReconTarget] = useState("");
  const [reconProgress, setReconProgress] = useState(0);

  // Theme Integration
  const currentPersona =
    settingsService.getSettings().general.persona || "ASSISTANT";
  const calculatedTheme = getThemeColors(currentPersona);
  const theme = propTheme || calculatedTheme;
  const themeHex = "var(--app-primary)";
  const themePrimary = theme.primary || "text-white";


  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    if (selectedReport) {
      fetchReportDetails(selectedReport.file);
    }
  }, [selectedReport]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/osint/investigations/list"));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setReports(data);
        } else if (
          data &&
          typeof data.reports === "object" &&
          data.reports !== null
        ) {
          if (Array.isArray(data.reports)) {
            setReports(data.reports);
          } else {
            setReports(Object.values(data.reports));
          }
        } else {
          setReports([]);
        }
      } else {
        setReports([]);
      }
    } catch (e) {
      console.error("Failed to fetch reports", e);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportDetails = async (filename: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        apiUrl(`/api/osint/investigations/${encodeURIComponent(filename)}`)
      );
      if (res.ok) {
        const data = await res.json();
        setReportDetails(data);
      }
    } catch {
      console.error("Failed to fetch report details");
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (
    report: InvestigationReport,
    format: "json" | "markdown"
  ) => {
    if (!reportDetails) return;

    let content = "";
    let filename = "";
    let mimeType = "";

    if (format === "json") {
      content = JSON.stringify(reportDetails, null, 2);
      filename = `${report.target.replace(/[^a-zA-Z0-9]/g, "_")}_${
        report.timestamp
      }.json`;
      mimeType = "application/json";
    } else {
      // Generate Markdown report
      content = `# Investigation Report: ${report.target}\n\n`;
      content += `**Date:** ${new Date(report.timestamp).toLocaleString()}\n`;
      content += `**Risk Score:** ${report.riskScore}/100\n`;
      content += `**Severity:** ${reportDetails.meta?.SEVERITY || "UNKNOWN"}\n`;
      content += `**Results Found:** ${report.resultCount}\n`;
      content += `**Engines Used:** ${
        reportDetails.enginesUsed?.join(", ") || "N/A"
      }\n`;
      if (reportDetails.torIp) {
        content += `**Tor IP:** ${reportDetails.torIp}\n`;
      }
      content += `\n---\n\n`;

      if (reportDetails.summary) {
        content += `## Executive Summary\n\n${reportDetails.summary}\n\n---\n\n`;
      }

      content += `## Findings\n\n`;
      if (reportDetails.hits && reportDetails.hits.length > 0) {
        reportDetails.hits.forEach((hit: any, index: number) => {
          content += `### Finding ${index + 1}\n\n`;
          content += `- **Title:** ${hit.title || "N/A"}\n`;
          content += `- **URL:** \`${hit.url}\`\n`;
          content += `- **Engine:** ${hit.engine || "Unknown"}\n`;
          if (hit.snippet) {
            content += `- **Snippet:** ${hit.snippet.substring(0, 200)}...\n`;
          }
          content += `\n`;
        });
      } else {
        content += `No findings reported.\n\n`;
      }

      content += `---\n\n`;
      content += `## Metadata\n\n`;
      content += `\`\`\`json\n${JSON.stringify(
        reportDetails.meta || {},
        null,
        2
      )}\n\`\`\`\n`;

      filename = `${report.target.replace(/[^a-zA-Z0-9]/g, "_")}_${
        report.timestamp
      }.md`;
      mimeType = "text/markdown";
    }

    // Download file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateSummary = async (report: InvestigationReport) => {
    if (!reportDetails) return;

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/osint/investigations/summarize"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: report.file }),
      });

      if (res.ok) {
        const data = await res.json();
        setReportDetails({ ...reportDetails, summary: data.summary });
        // Update report in list
        setReports(
          reports.map((r) =>
            r.file === report.file ? { ...r, summary: data.summary } : r
          )
        );
      }
    } catch {
      console.error("Failed to generate summary");
    } finally {
      setLoading(false);
    }
  };

  const startLiveRecon = async () => {
    if (!reconTarget.trim()) return;
    setLoading(true);
    setReconProgress(10);
    
    try {
      const { llmService } = await import("../services/llmService");
      const brain = llmService.getProvider("gemini");
      
      setReconProgress(30);
      const prompt = `Perform a forensic OSINT reconnaissance on the following target: "${reconTarget}".
Provide a comprehensive dossier including:
1. Executive Summary
2. Estimated Risk Score (0-100)
3. Key Findings (URLs, Snippets, Entities)
4. Severity Assessment

Format the output as a JSON object:
{
  "target": "${reconTarget}",
  "riskScore": 75,
  "summary": "...",
  "hits": [{"title": "...", "url": "...", "snippet": "...", "engine": "GOOGLE"}],
  "meta": {"SEVERITY": "HIGH" | "MEDIUM" | "LOW"}
}`;

      setReconProgress(60);
      const synthesis = await brain.generate(prompt, { temperature: 0.3 });
      const data = JSON.parse(synthesis.match(/\{[\s\S]*\}/)?.[0] || "{}");
      
      setReconProgress(90);
      const newReport: InvestigationReport = {
        file: `live_${Date.now()}.json`,
        target: data.target || reconTarget,
        timestamp: Date.now(),
        riskScore: data.riskScore || 50,
        resultCount: data.hits?.length || 0,
        summary: data.summary,
      };

      setReports([newReport, ...reports]);
      setSelectedReport(newReport);
      setReportDetails(data);
      setIsReconMode(false);
      setReconTarget("");
    } catch (e) {
      console.error("Live Recon Failed:", e);
    } finally {
      setLoading(false);
      setReconProgress(0);
    }
  };

  const filteredReports = reports.filter(
    (r) =>
      r.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.file.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };


  const getRiskColor = (score: number): string => {
    if (score >= 70) return "var(--app-status-danger)";
    if (score >= 40) return "var(--app-status-warning)";
    return "var(--app-status-success)";
  };

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center glass-blur animate-in fade-in duration-300 font-mono p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
    >
      <div
        className={`relative w-full h-[92vh] max-w-7xl flex flex-col overflow-hidden rounded-2xl border shadow-2xl tech-border`}
        style={{
          backgroundColor: theme?.isLight
            ? "rgba(229, 225, 205, var(--app-bg-opacity, 0.3))"
            : "rgba(5, 5, 5, var(--app-bg-opacity, 0.3))",
          borderColor: "var(--app-border-main)",
        }}
      >
        {/* Header */}
        <div
          className="h-16 flex-shrink-0 border-b flex items-center justify-between px-8 relative z-30"
          style={{ 
            borderColor: "var(--app-border-main)",
            backgroundColor: "var(--app-bg-tint)"
          }}
        >
          <div className="flex items-center gap-5 overflow-hidden">
            <div
              className={`p-2 rounded-xl border flex-shrink-0 ${themePrimary}`}
              style={{
                backgroundColor: "rgba(0,0,0,0.4)",
                borderColor: `${themeHex}22`,
                color: themeHex,
              }}
            >
                <Icon name="SearchCode" size={24} variant="BoldDuotone" />
            </div>
            <div className="space-y-0.5 overflow-hidden">
              <h2 className="font-black text-sm tracking-[0.3em] uppercase italic text-[var(--app-text-main)] truncate">
                Security Reports
              </h2>
              <div className="text-[9px] font-black uppercase tracking-widest flex gap-4 text-[var(--app-text-muted)] truncate">
                <span>IDENTITY: {reports.length} ARCHIVED</span>
                <span>ENGINE: OSINT_GLOBAL_V2</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:bg-white/5 active:scale-95 text-[var(--app-text-muted)]"
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar: Report List */}
          <div
            className="w-80 border-r flex flex-col overflow-hidden"
            style={{ 
                borderColor: "var(--app-border-main)",
                backgroundColor: "rgba(0,0,0,0.2)"
            }}
          >
            <div className="p-5 border-b space-y-4" style={{ borderColor: "var(--app-border-main)" }}>
                <div className="relative">
                    <Icon
                    name="Search"
                    size={14}
                    className="absolute left-3 top-2.5"
                    color="var(--app-text-muted)"
                    />
                    <input
                    type="text"
                    placeholder="Search reports..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-black/20 border rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--app-text-main)] placeholder-[var(--app-text-muted)] focus:outline-none"
                    style={{ borderColor: "var(--app-border-main)" }}
                    />
                </div>
                <div className="text-[9px] font-black tracking-[0.2em] uppercase text-[var(--app-text-muted)]">
                    Report History
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-2">
              {loading && reports.length === 0 ? (
                <div className="text-[var(--app-text-muted)] text-[10px] italic p-4 font-black uppercase tracking-widest">
                  ACCESSING ENCRYPTED FILES...
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="text-[var(--app-text-muted)] text-[10px] italic p-4 font-black uppercase tracking-widest text-center">
                  NO MATCHING DOSSIERS
                </div>
              ) : (
                filteredReports.map((report) => (
                  <button
                    key={report.file}
                    onClick={() => setSelectedReport(report)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all relative overflow-hidden group
                      ${selectedReport?.file === report.file ? "shadow-lg" : "hover:bg-white/5"}`}
                    style={{ 
                        backgroundColor: selectedReport?.file === report.file ? "var(--app-bg-tint)" : "transparent",
                        borderColor: selectedReport?.file === report.file ? "var(--app-primary)" : "var(--app-border-main)"
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                         <div className="flex items-center gap-2">
                            <Icon
                                name="AlertTriangle"
                                size={12}
                                color={getRiskColor(report.riskScore)}
                            />
                            <span className="text-[var(--app-text-main)] font-black text-[10px] uppercase tracking-widest truncate">
                                {report.target}
                            </span>
                         </div>
                         <span className="text-[9px] font-mono opacity-60 text-[var(--app-text-main)]">
                            {formatDate(report.timestamp).split(',')[0]}
                         </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-0.5">
                            <div className="text-[8px] font-black text-[var(--app-text-muted)] uppercase tracking-tighter">RISK_INDEX</div>
                            <div className="text-[10px] font-black italic" style={{ color: getRiskColor(report.riskScore) }}>
                                {report.riskScore}% CRITICAL
                            </div>
                        </div>
                        <div className="space-y-0.5 text-right">
                             <div className="text-[8px] font-black text-[var(--app-text-muted)] uppercase tracking-tighter">HITS_FOUND</div>
                             <div className="text-[10px] font-black text-[var(--app-text-main)]">
                                {report.resultCount} NODES
                             </div>
                        </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Main Area: Report Details */}
          <div className="flex-1 flex flex-col overflow-hidden bg-transparent">
            {isReconMode || (reports.length === 0 && !loading) ? (
              <div className="flex-1 flex items-center justify-center p-10">
                <div className={`w-full max-w-xl p-10 rounded-3xl border glass-blur-heavy space-y-8 animate-in zoom-in-95 duration-500`}
                     style={{ backgroundColor: "rgba(0,0,0,0.4)", borderColor: "var(--app-primary)" }}>
                  <div className="text-center space-y-3">
                    <Icon name="Target" size={48} color="var(--app-primary)" className="mx-auto animate-pulse" />
                    <h3 className="text-xl font-black uppercase tracking-[0.3em] text-[var(--app-text-main)]">Target Acquisition</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">Initiate sovereign reconnaissance protocol</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="relative">
                       <input 
                         type="text" 
                         value={reconTarget}
                         onChange={(e) => setReconTarget(e.target.value)}
                         placeholder="Enter target name, domain, or identifier..."
                         className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm font-black uppercase tracking-widest text-white placeholder-white/20 focus:outline-none focus:border-[var(--app-primary)] transition-all"
                       />
                    </div>
                    
                    <button 
                      onClick={startLiveRecon}
                      disabled={loading || !reconTarget.trim()}
                      className="w-full py-4 bg-[var(--app-primary)] text-black rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all active:scale-95 disabled:opacity-30 flex items-center justify-center gap-3"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                          Acquiring... {reconProgress}%
                        </>
                      ) : (
                        <>
                          <Icon name="Radar" size={16} />
                          Initialize Recon
                        </>
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-4 pt-4 border-t border-white/5 opacity-40">
                     <div className="flex-1 h-[1px] bg-white/10" />
                     <span className="text-[8px] font-black uppercase tracking-widest">Global OSINT Grid Active</span>
                     <div className="flex-1 h-[1px] bg-white/10" />
                  </div>
                </div>
              </div>
            ) : selectedReport && reportDetails ? (
              <>
                <div
                  className="h-20 flex-shrink-0 border-b flex items-center justify-between px-10"
                  style={{ 
                      borderColor: "var(--app-border-main)",
                      backgroundColor: "var(--app-bg-tint)" 
                  }}
                >
                  <div className="flex items-center gap-6 overflow-hidden">
                    <Icon
                      name="FileText"
                      size={24}
                      color="var(--app-primary)"
                      variant="BoldDuotone"
                    />
                    <div className="space-y-0.5">
                      <h3 className="text-[var(--app-text-main)] font-black text-lg uppercase italic tracking-widest truncate">
                        {selectedReport.target}
                      </h3>
                      <div className="text-[9px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">
                        COLLECTED: {formatDate(selectedReport.timestamp)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {!reportDetails.summary && (
                      <button
                        onClick={() => generateSummary(selectedReport)}
                        disabled={loading}
                        className="px-4 py-2 border rounded-xl text-[10px] font-black tracking-widest uppercase flex items-center gap-2 transition-all hover:bg-[var(--app-primary)] hover:text-black"
                        style={{ 
                            borderColor: "var(--app-primary)",
                            color: "var(--app-primary)"
                        }}
                      >
                        <Icon name="Sparkles" size={14} />
                        ANALYZE
                      </button>
                    )}
                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                        <select
                        value={exportFormat}
                        onChange={(e) =>
                            setExportFormat(e.target.value as "json" | "markdown")
                        }
                        className="bg-transparent text-white text-[10px] font-black uppercase tracking-widest px-3 focus:outline-none"
                        >
                        <option value="markdown">MD</option>
                        <option value="json">JSON</option>
                        </select>
                        <button
                        onClick={() => exportReport(selectedReport, exportFormat)}
                        className="px-4 py-2 bg-[var(--app-primary)] text-black rounded-lg text-[10px] font-black tracking-widest uppercase transition-all active:scale-95"
                        >
                        EXPORT
                        </button>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-12">
                  {/* Summary Section */}
                  {reportDetails.summary && (
                    <section className="p-8 rounded-2xl border" style={{ 
                        backgroundColor: "var(--app-bg-tint)",
                        borderColor: "var(--app-primary)"
                    }}>
                      <div className="flex items-center gap-3 mb-6">
                        <Icon name="TrendingUp" size={18} color="var(--app-primary)" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: "var(--app-primary)" }}>
                            REPORT SUMMARY
                        </h4>
                      </div>
                      <p className="text-[var(--app-text-main)] font-bold text-sm leading-relaxed italic opacity-90">
                        {reportDetails.summary}
                      </p>
                    </section>
                  )}

                  <div className="grid grid-cols-3 gap-8">
                      {/* Risk Index Card */}
                      <div className="col-span-1 p-6 rounded-2xl border glass-blur space-y-6" style={{ borderColor: "var(--app-border-main)", backgroundColor: "rgba(0,0,0,0.4)" }}>
                          <div className="flex justify-between items-center">
                             <h4 className="text-[9px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">RISK LEVEL</h4>
                             <Icon name="Activity" size={16} color="var(--app-primary)" />
                          </div>
                          <div className="space-y-2">
                             <div className="flex justify-between items-end">
                                <span className="text-4xl font-black italic tracking-tighter" style={{ color: getRiskColor(selectedReport.riskScore) }}>
                                    {selectedReport.riskScore}%
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: getRiskColor(selectedReport.riskScore) }}>
                                    {reportDetails.meta?.SEVERITY || "UNKNOWN"}
                                </span>
                             </div>
                             <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full transition-all duration-1000"
                                    style={{ 
                                        width: `${selectedReport.riskScore}%`,
                                        backgroundColor: getRiskColor(selectedReport.riskScore),
                                        boxShadow: `0 0 10px ${getRiskColor(selectedReport.riskScore)}`
                                    }}
                                />
                             </div>
                          </div>
                      </div>

                      {/* Engine Stats Card */}
                      <div className="col-span-1 p-6 rounded-2xl border glass-blur space-y-6" style={{ borderColor: "var(--app-border-main)", backgroundColor: "rgba(0,0,0,0.4)" }}>
                          <div className="flex justify-between items-center">
                             <h4 className="text-[9px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">NODE_VISIBILITY</h4>
                             <Icon name="Network" size={16} color="var(--app-primary)" />
                          </div>
                          <div className="space-y-1">
                               <div className="text-4xl font-black italic tracking-tighter text-[var(--app-text-main)]">
                                    {reportDetails.hits?.length || 0}
                               </div>
                               <div className="text-[9px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">
                                     THREATS IDENTIFIED
                               </div>
                          </div>
                      </div>

                      {/* Network Origin Card */}
                      <div className="col-span-1 p-6 rounded-2xl border glass-blur space-y-6" style={{ borderColor: "var(--app-border-main)", backgroundColor: "rgba(0,0,0,0.4)" }}>
                          <div className="flex justify-between items-center">
                             <h4 className="text-[9px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">NETWORK_ORIGIN</h4>
                             <Icon name="Navigation" size={16} color="var(--app-primary)" />
                          </div>
                          <div className="space-y-1">
                               <div className="text-xl font-black italic tracking-tighter text-[var(--app-text-main)] truncate">
                                    {reportDetails.torIp || "OSINT_DIRECT"}
                               </div>
                               <div className="text-[9px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">
                                    ANONYMIZED ROUTING NODE
                               </div>
                          </div>
                      </div>
                  </div>

                  {/* Findings Table */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <Icon name="Rows" size={16} color="var(--app-primary)" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--app-text-main)]">
                            EVIDENCE LOG ({reportDetails.hits?.length || 0})
                        </h4>
                    </div>
                    <div className="space-y-4">
                      {reportDetails.hits && reportDetails.hits.length > 0 ? (
                        reportDetails.hits.map((hit: any, index: number) => (
                          <div
                            key={index}
                            className="p-6 rounded-2xl border glass-blur hover:bg-white/5 transition-all group"
                            style={{ borderColor: "var(--app-border-main)", backgroundColor: "rgba(0,0,0,0.2)" }}
                          >
                            <div className="flex items-start justify-between mb-4">
                                <div className="space-y-1">
                                    <h5 className="text-[var(--app-text-main)] font-black text-sm uppercase tracking-wider group-hover:text-[var(--app-primary)] transition-colors">
                                        {hit.title || `DETECTION_NODE_${index + 1}`}
                                    </h5>
                                    <div className="text-[10px] font-black font-mono text-[var(--app-text-muted)] group-hover:text-white/60 transition-colors truncate max-w-2xl">
                                        {hit.url}
                                    </div>
                                </div>
                                <span className="px-3 py-1 bg-black/40 border border-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">
                                    {hit.engine || "UNKNOWN"}
                                </span>
                            </div>
                            {hit.snippet && (
                              <p className="text-xs text-[var(--app-text-muted)] leading-relaxed italic border-t border-white/5 pt-4">
                                &quot;{hit.snippet}&quot;
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-[var(--app-text-muted)] text-sm italic font-black uppercase tracking-widest opacity-20 py-20 text-center">
                          NO POSSITIVE DETECTION LOGS FOUND
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-6 opacity-20" style={{ color: themeHex }}>
                  <Icon name="SearchCode" size={120} variant="BoldDuotone" className="mx-auto" />
                  <div className="space-y-2">
                    <p className="text-lg font-black uppercase tracking-[0.4em] text-[var(--app-text-main)]">Select a Dossier</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-main)] opacity-40">OPERATOR AUTHORIZATION REQUIRED</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestigationReports;
