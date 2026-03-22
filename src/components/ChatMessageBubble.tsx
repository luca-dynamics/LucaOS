import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import * as LucideIcons from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus,
  vs } from "react-syntax-highlighter/dist/esm/styles/prism";
const {
  Copy,
  Terminal,
  ImageIcon,
  Globe,
  ExternalLink,
  Sparkles,
  Pencil,
  Check,
  TrendingUp,
  AlertTriangle,
  Info,
  CheckCircle2,
} = LucideIcons as any;
import { PersonaType } from "../services/lucaService";
import { TacticalLog, MessageAction } from "../types";
import InlineActionFlow from "./chat/InlineActionFlow";
import ChartRenderer from "./chat/ChartRenderer";

interface ChatMessageBubbleProps {
  text: string;
  sender: "user" | "luca" | "system";
  timestamp: number;
  persona: PersonaType;
  primaryColor: string;
  isProcessing?: boolean;
  attachment?: string | null;
  generatedImage?: string | null;
  groundingMetadata?: any;
  wasPruned?: boolean;
  isStreaming?: boolean;
  onEdit?: (text: string) => void;
  actions?: MessageAction[];
  onActionClick?: (action: MessageAction) => void;
  tacticalData?: {
    type: "SECURITY" | "HACKING" | "TACTICAL";
    status: string;
    logs: TacticalLog[];
    title?: string;
  };
  isLight?: boolean;
}

const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  text,
  sender,
  timestamp,
  primaryColor,
  isProcessing,
  attachment,
  generatedImage,
  groundingMetadata,
  wasPruned,
  isStreaming,
  onEdit,
  actions,
  onActionClick,
  tacticalData,
  isLight = false,
}) => {
  const isUser = sender === "user";
  const isSystem = sender === "system";
  const [copiedCodeBlock, setCopiedCodeBlock] = useState<number | null>(null);

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeBlock(index);
    setTimeout(() => setCopiedCodeBlock(null), 2000);
  };

  // System messages (errors, status updates, notifications)
  if (isSystem) {
    const isError = text.includes("[ERROR]") || text.includes("[CRITICAL]");
    const isWarning = text.includes("[WARNING]") || text.includes("[HIGH]");
    const isSuccess = text.includes("[SUCCESS]");
    const isTrading = text.includes("[TRADING]");

    const SystemIcon = isError ? AlertTriangle : isWarning ? Info : isSuccess ? CheckCircle2 : isTrading ? TrendingUp : Terminal;
    const iconColor = isError ? "text-rose-500" : isWarning ? "text-amber-500" : isSuccess ? "text-emerald-500" : isTrading ? "text-indigo-400" : "text-slate-500";
    const bgClass = isError ? "bg-rose-500/5 border-rose-500/20" : isWarning ? "bg-amber-500/5 border-amber-500/20" : isSuccess ? "bg-emerald-500/5 border-emerald-500/20" : isTrading ? "bg-indigo-500/5 border-indigo-500/20" : "bg-slate-900/50 border-slate-800";

    return (
      <div className="flex justify-center my-2 animate-in fade-in zoom-in duration-300 w-full">
        <div
          className={`text-[10px] font-mono ${isLight ? "text-gray-500 bg-white/50 border-gray-200" : `text-slate-400 ${bgClass}`} px-4 py-2 rounded-lg border flex items-center gap-3 max-w-[90%] shadow-sm`}
        >
          <SystemIcon size={12} className={iconColor} />
          <span className="flex-1 truncate">{text.replace(/\[[^\]]*\]\s*/g, "")}</span>
        </div>
      </div>
    );
  }

  // User Messages (Right Aligned)
  if (isUser) {
    return (
      <div className="flex justify-end mb-1 group animate-in slide-in-from-right-2 duration-300">
        <div className="max-w-[85%] sm:max-w-[75%] relative flex flex-col items-end">
          {/* User Attachment */}
          {attachment && (
            <div className="mb-2 overflow-hidden rounded-xl border border-white/10 shadow-lg">
              {wasPruned ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-black/40 p-3 backdrop-blur-md">
                  <ImageIcon size={14} /> [IMAGE DATAPRUNED]
                </div>
              ) : (
                <img
                  src={
                    attachment.startsWith("data:")
                      ? attachment
                      : `data:image/jpeg;base64,${attachment}`
                  }
                  alt="User Attachment"
                  className="max-h-48 rounded-lg object-cover bg-black/20"
                />
              )}
            </div>
          )}

          <div
            className={`rounded-2xl rounded-tr-sm px-4 py-3 ${isLight ? "text-gray-900" : "text-white"} text-[14px] leading-relaxed relative overflow-hidden backdrop-blur-sm`}
            style={{
              backgroundColor: isLight
                ? "rgba(0, 0, 0, 0.05)"
                : `${primaryColor}20`,
              border: isLight
                ? "1px solid rgba(0, 0, 0, 0.15)"
                : `1px solid ${primaryColor}40`,
            }}
          >
            <div className="whitespace-pre-wrap font-sans relative z-10">
              {text}
            </div>
          </div>

          {/* Footer Actions for user message */}
          <div className="flex items-center justify-between mt-1 mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 select-none font-medium">
                {new Date(timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {onEdit && (
                <button
                  onClick={() => onEdit(text)}
                  className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-md hover:bg-white/5 active:bg-white/10"
                  title="Edit message"
                >
                  <Pencil size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // AI Messages (Left Aligned)
  const isLoadingState =
    isProcessing && (!text || text === "..." || text.trim() === "");

  return (
    <div className="flex justify-start mb-6 group w-full animate-in slide-in-from-left-2 duration-300">
      <div className="flex flex-col gap-2 w-full max-w-full">
        {/* Avatar row - only shown when loading (waiting for response) */}
        {isLoadingState && (
          <div className="flex items-center gap-3">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shadow-lg border ${isLight ? "border-gray-200 bg-white/40" : "border-white/10 bg-black/40"} backdrop-blur-sm`}
            >
              <div
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{
                  backgroundColor: primaryColor,
                  boxShadow: `0 0 10px ${primaryColor}`,
                }}
              />
            </div>
            {/* Loading dots next to avatar */}
            <div className="flex items-center gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ backgroundColor: primaryColor, animationDelay: "0ms" }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{
                  backgroundColor: primaryColor,
                  animationDelay: "150ms",
                }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{
                  backgroundColor: primaryColor,
                  animationDelay: "300ms",
                }}
              />
            </div>
          </div>
        )}

        {/* Content area - only shown when NOT in loading state */}
        {!isLoadingState && (
          <div className="flex-1 min-w-0 w-full px-4 py-3 rounded-2xl rounded-tl-sm transition-all relative overflow-hidden bg-black/5"
               style={{
                 backgroundColor: isLight ? "rgba(0, 0, 0, 0.02)" : "rgba(255, 255, 255, 0.02)",
                 border: isLight ? "1px solid rgba(0,0,0,0.05)" : "1px solid rgba(255,255,255,0.05)"
               }}>
            
            {/* INLINE ACTION FLOW - Repositioned to top for immersion */}
            {tacticalData && (
              <InlineActionFlow 
                logs={tacticalData.logs}
                status={tacticalData.status}
                themeColor={primaryColor}
                isLight={isLight}
              />
            )}

            <div className="rounded-2xl rounded-tl-sm px-0 py-0 transition-all relative overflow-hidden">
              {/* Generated Image inside bubble */}
              {generatedImage && (
                <div className="mb-4 overflow-hidden rounded-xl border border-slate-700/50 bg-black/20 shadow-lg inline-block max-w-full">
                  <div className="px-3 py-1.5 bg-white/5 text-[10px] text-slate-400 font-bold tracking-widest border-b border-white/5 flex items-center gap-2">
                    <Sparkles size={10} style={{ color: primaryColor }} />
                    GENERATED ASSET
                  </div>
                  {wasPruned ? (
                    <div className="p-8 text-center text-xs text-slate-500 font-mono bg-slate-900/50">
                      [GENERATED IMAGE EXPIRED FROM CACHE]
                    </div>
                  ) : (
                    <img
                      src={`data:image/jpeg;base64,${generatedImage}`}
                      alt="AI Generated"
                      className="max-h-80 w-auto object-contain bg-black/50"
                    />
                  )}
                </div>
              )}

              <div
                className={`${isLight ? "prose-slate" : "prose-invert prose-slate"} prose max-w-none text-[15px] leading-7 font-sans ${isLight ? "text-gray-900" : "text-white/90"}`}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || "");
                      const codeString = String(children).replace(/\n$/, "");

                      // CHART DETECTION: Check if it's JSON and looks like a chart
                      if (!inline && match && (match[1] === "json" || match[1] === "chart")) {
                        try {
                          const parsed = JSON.parse(codeString);
                          if (parsed.type === "chart" && Array.isArray(parsed.data)) {
                            return (
                              <ChartRenderer 
                                data={parsed.data}
                                type={parsed.chartType || "bar"}
                                themeColor={primaryColor}
                                isLight={isLight}
                              />
                            );
                          }
                        } catch {
                          // Fallback to regular code block if parsing fails
                        }
                      }

                      if (!inline && match) {
                        const blockIndex = Math.random();

                        return (
                          <div
                            className={`relative group/code my-6 overflow-hidden rounded-xl border ${isLight ? "border-gray-200 bg-gray-50/50" : "border-white/10 bg-[#0d0d0d] shadow-2xl"}`}
                            style={{
                              boxShadow: isLight ? "none" : `0 0 30px ${primaryColor}08`,
                            }}
                          >
                            <div
                              className={`flex items-center justify-between px-4 py-2 ${isLight ? "bg-gray-100/80 border-gray-200" : "bg-white/5 border-white/5"} border-b`}
                            >
                              <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                  <div className="w-2 h-2 rounded-full bg-red-500/50" />
                                  <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                                  <div className="w-2 h-2 rounded-full bg-green-500/50" />
                                </div>
                                <span
                                  className={`text-[10px] font-mono uppercase tracking-[0.2em] font-black ${isLight ? "text-gray-500" : "text-slate-400"}`}
                                >
                                  {match[1]}
                                </span>
                              </div>
                              <button
                                onClick={() =>
                                  handleCopyCode(codeString, blockIndex)
                                }
                                className={`${isLight ? "text-gray-500 hover:text-gray-800" : "text-slate-400 hover:text-white"} transition-all active:scale-90`}
                                title="Copy Code"
                              >
                                {copiedCodeBlock === blockIndex ? (
                                  <Check size={14} className="text-green-500" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            </div>
                            <div className="relative">
                              <SyntaxHighlighter
                                style={isLight ? vs : vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                customStyle={{
                                  margin: 0,
                                  padding: "1.25rem",
                                  background: "transparent",
                                  fontSize: "13px",
                                  lineHeight: "1.6",
                                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                }}
                                {...props}
                              >
                                {codeString}
                              </SyntaxHighlighter>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <code
                          className={`${isLight ? "bg-gray-100/80 text-gray-900 font-bold" : "bg-slate-800/60 text-emerald-300"} px-1.5 py-0.5 rounded text-[13px] font-mono`}
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    table({ children }) {
                      return (
                        <div
                          className={`overflow-x-auto my-6 rounded-xl border animate-in fade-in slide-in-from-bottom-2 duration-500 ${isLight ? "border-gray-200 bg-white/40 shadow-sm" : "border-white/10 bg-black/20 shadow-2xl"}`}
                          style={{
                            boxShadow: isLight ? "none" : `0 10px 30px rgba(0,0,0,0.3), 0 0 20px ${primaryColor}05`,
                          }}
                        >
                          <table
                            className={`min-w-full divide-y ${isLight ? "divide-gray-200" : "divide-white/10"} text-[13px]`}
                          >
                            {children}
                          </table>
                        </div>
                      );
                    },
                    thead({ children }) {
                      return (
                        <thead
                          className={isLight ? "bg-gray-50" : "bg-slate-800/50"}
                        >
                          {children}
                        </thead>
                      );
                    },
                    th({ children }) {
                      return (
                        <th
                          className={`px-4 py-3 text-left text-[11px] font-black ${isLight ? "text-gray-900" : "text-white/70"} uppercase tracking-[0.15em] font-mono`}
                        >
                          {children}
                        </th>
                      );
                    },
                    tbody({ children }) {
                      return (
                        <tbody
                          className={`divide-y ${isLight ? "divide-gray-100 bg-white/40" : "divide-slate-700/50 bg-slate-900/20"}`}
                        >
                          {children}
                        </tbody>
                      );
                    },
                    tr({ children }) {
                      return (
                        <tr
                          className={`transition-colors ${isLight ? "hover:bg-gray-50/50" : "hover:bg-white/5"}`}
                        >
                          {children}
                        </tr>
                      );
                    },
                    td({ children }) {
                      return (
                        <td
                          className={`px-4 py-3 whitespace-nowrap font-medium ${isLight ? "text-gray-800" : "text-white/90"}`}
                        >
                          {children}
                        </td>
                      );
                    },
                    a({ href, children }) {
                      return (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline decoration-blue-400/30 underline-offset-4 transition-all"
                        >
                          {children}
                        </a>
                      );
                    },
                    ul({ children }) {
                      return (
                        <ul
                          className={`list-disc pl-5 my-2 space-y-1 ${isLight ? "text-gray-800 marker:text-gray-400" : "text-slate-300 marker:text-slate-500"}`}
                        >
                          {children}
                        </ul>
                      );
                    },
                    ol({ children }) {
                      return (
                        <ol
                          className={`list-decimal pl-5 my-2 space-y-1 ${isLight ? "text-gray-800 marker:text-gray-400" : "text-slate-300 marker:text-slate-500"}`}
                        >
                          {children}
                        </ol>
                      );
                    },
                    blockquote({ children }) {
                      return (
                        <div
                          className={`border-l-4 ${isLight ? "border-gray-300 bg-gray-100/30" : "border-slate-700 bg-slate-800/10"} pl-4 py-1 my-4 italic ${isLight ? "text-gray-600" : "text-slate-400"} rounded-r-lg`}
                        >
                          {children}
                        </div>
                      );
                    },
                  }}
                >
                  {text}
                </ReactMarkdown>
                {isStreaming && (
                  <span
                    className="inline-block w-2 h-4 ml-1 translate-y-0.5 animate-pulse"
                    style={{ backgroundColor: primaryColor }}
                  />
                )}

                {/* RICH TERMINAL ACTIONS (Phase 4.3) */}
                {actions && actions.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {actions.map((action) => (
                      <button
                        key={action.id}
                        onClick={() => onActionClick?.(action)}
                        className={`px-4 py-2 rounded-lg text-[12px] font-bold tracking-tight transition-all active:scale-95 border flex items-center gap-2 group/btn`}
                        style={{
                          backgroundColor: action.variant === "primary" ? `${primaryColor}20` : 
                                          action.variant === "danger" ? "rgba(239, 68, 68, 0.1)" : 
                                          "rgba(255, 255, 255, 0.05)",
                          borderColor: action.variant === "primary" ? `${primaryColor}40` : 
                                       action.variant === "danger" ? "rgba(239, 68, 68, 0.3)" : 
                                       "rgba(255, 255, 255, 0.1)",
                          color: action.variant === "primary" ? primaryColor : 
                                 action.variant === "danger" ? "#ef4444" : 
                                 "#94a3b8"
                        }}
                      >
                        {action.variant === "primary" && <LucideIcons.CheckCircle2 size={12} className="group-hover/btn:scale-110 transition-transform" /> }
                        {action.variant === "danger" && <LucideIcons.XCircle size={12} className="group-hover/btn:scale-110 transition-transform" /> }
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>


              {/* Grounding / Sources inside bubble */}
              {groundingMetadata?.groundingChunks &&
                groundingMetadata.groundingChunks.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 pt-2 border-t border-white/5">
                    {groundingMetadata.groundingChunks.map(
                      (chunk: any, i: number) => {
                        if (!chunk.web?.uri) return null;
                        return (
                          <a
                            key={i}
                            href={chunk.web.uri}
                            target="_blank"
                            rel="noreferrer"
                            className={`flex items-center gap-1.5 border transition-all text-[10px] px-2.5 py-1.5 rounded-full ${isLight ? "bg-white/50 border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-900 hover:bg-white" : "bg-slate-800/40 border-slate-700/50 hover:border-slate-500 text-slate-400 hover:text-white hover:bg-slate-800/60"}`}
                          >
                            <Globe size={11} />
                            <span className="truncate max-w-[150px]">
                              {chunk.web.title || "Source"}
                            </span>
                            <ExternalLink size={8} className="opacity-50" />
                          </a>
                        );
                      },
                    )}
                  </div>
                )}

              {/* Footer Actions inside bubble */}
              {!isProcessing && (
                <div className="flex items-center justify-between mt-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 select-none font-medium">
                      {new Date(timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText(text)}
                      className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-md hover:bg-white/5 active:bg-white/10"
                      title="Copy full response"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessageBubble;
