import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Icon, IconProvider } from "./ui/Icon";
import { PersonaType } from "../services/lucaService";
import { TacticalLog, MessageAction } from "../types";
import InlineActionFlow from "./chat/InlineActionFlow";
import ChartRenderer from "./chat/ChartRenderer";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

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

    const iconColor = isError ? "text-rose-500" : isWarning ? "text-amber-500" : isSuccess ? "text-emerald-500" : isTrading ? "text-indigo-400" : "text-slate-500";
    const bgClass = isError ? "bg-rose-500/5 border-rose-500/20" : isWarning ? "bg-amber-500/5 border-amber-500/20" : isSuccess ? "bg-emerald-500/5 border-emerald-500/20" : isTrading ? "bg-indigo-500/5 border-indigo-500/20" : "bg-slate-900/50 border-slate-800";

    return (
      <div className="flex justify-center my-2 animate-in fade-in zoom-in duration-300 w-full">
        <div
          className={`text-[10px] font-mono px-4 py-2 rounded-lg border flex items-center gap-3 max-w-[90%] shadow-sm glass-blur ${bgClass}`}
          style={{ 
            borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
            backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.2))",
            color: "var(--app-text-muted, #94a3b8)"
          }}
        >
          <Icon name={isError ? "Danger" : isWarning ? "InfoCircle" : isSuccess ? "CheckCircle" : isTrading ? "Chart" : "Terminal"} size={12} className={iconColor} variant="BoldDuotone" />
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
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-black/40 p-3 glass-blur">
                  <Icon name="Image" size={14} variant="BoldDuotone" /> [IMAGE DATAPRUNED]
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
            className="rounded-2xl rounded-tr-sm px-4 py-3 text-[14px] leading-relaxed relative overflow-hidden glass-blur"
            style={{
              color: "var(--app-text-main, #ffffff)",
              backgroundColor: "var(--app-bg-tint, rgba(255, 255, 255, 0.05))",
              borderColor: "var(--app-border-main, rgba(255, 255, 255, 0.1))",
              borderWidth: "1px",
              borderStyle: "solid"
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
                  <Icon name="Pencil" size={12} variant="BoldDuotone" />
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
              className="w-6 h-6 rounded-full flex items-center justify-center shadow-lg border glass-blur"
              style={{
                borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
                backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.4))"
              }}
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
          <div className="flex-1 min-w-0 w-full px-4 py-3 rounded-2xl rounded-tl-sm transition-all relative overflow-hidden glass-blur"
               style={{
                 backgroundColor: "var(--app-bg-tint, rgba(255, 255, 255, 0.02))",
                 border: "1px solid var(--app-border-main, rgba(255, 255, 255, 0.05))"
               }}>
            
            {/* INLINE ACTION FLOW - Repositioned to top for immersion */}
            {tacticalData && (
              <InlineActionFlow 
                logs={tacticalData.logs}
                status={tacticalData.status}
                themeColor={primaryColor}
              />
            )}

            <div className="rounded-2xl rounded-tl-sm px-0 py-0 transition-all relative overflow-hidden">
              {/* Generated Image inside bubble */}
              {generatedImage && (
                <div className="mb-4 overflow-hidden rounded-xl border border-slate-700/50 bg-black/20 shadow-lg inline-block max-w-full">
                  <div className="px-3 py-1.5 bg-white/5 text-[10px] text-slate-400 font-bold tracking-widest border-b border-white/5 flex items-center gap-2">
                    <Icon name="MagicStick" size={10} variant="BoldDuotone" color={primaryColor} />
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
                className="prose max-w-none text-[15px] leading-7 font-sans"
                style={{ color: "var(--app-text-main, #ffffff)" }}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Custom text processing for [[Icon]] tags
                    p({ children }) {
                      const processChildren = (child: any): any => {
                        if (typeof child === 'string') {
                          const parts = child.split(/(\[\[[A-Za-z0-9:]+\]\])/g);
                          return parts.map((part, i) => {
                            const match = part.match(/\[\[(?:([A-Za-z]+):)?([A-Za-z0-9]+)\]\]/);
                            if (match) {
                              const provider = (match[1]?.toLowerCase() as IconProvider) || 'auto';
                              const name = match[2];
                              return (
                                <Icon 
                                  key={i}
                                  name={name} 
                                  provider={provider} 
                                  size={16} 
                                  variant="BoldDuotone" 
                                  className="inline-block align-text-bottom mx-1 transition-transform hover:scale-110"
                                  color={primaryColor}
                                />
                              );
                            }
                            return part;
                          });
                        }
                        if (Array.isArray(child)) return child.map(processChildren);
                        return child;
                      };
                      return <p>{processChildren(children)}</p>;
                    },
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
                            className="relative group/code my-6 overflow-hidden rounded-xl border glass-blur"
                            style={{
                              borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
                              backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.2))",
                              boxShadow: `0 0 30px ${primaryColor}08`,
                            }}
                          >
                            <div
                              className="flex items-center justify-between px-4 py-2 border-b"
                              style={{ 
                                backgroundColor: "var(--app-bg-tint, rgba(255,255,255,0.05))",
                                borderColor: "var(--app-border-main, rgba(255,255,255,0.1))"
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                  <div className="w-2 h-2 rounded-full bg-red-500/50" />
                                  <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                                  <div className="w-2 h-2 rounded-full bg-green-500/50" />
                                </div>
                                <span
                                  className="text-[10px] font-mono uppercase tracking-[0.2em] font-black"
                                  style={{ color: "var(--app-text-muted, #94a3b8)" }}
                                >
                                  {match[1]}
                                </span>
                              </div>
                              <button
                                onClick={() =>
                                  handleCopyCode(codeString, blockIndex)
                                }
                                className="transition-all active:scale-90"
                                style={{ color: "var(--app-text-muted, #94a3b8)" }}
                                title="Copy Code"
                              >
                                {copiedCodeBlock === blockIndex ? (
                                  <Icon name="CheckCircle" size={14} color="#10b981" variant="BoldDuotone" />
                                ) : (
                                  <Icon name="Copy" size={14} variant="BoldDuotone" />
                                )}
                              </button>
                            </div>
                            <div className="relative">
                              <SyntaxHighlighter
                                style={vscDarkPlus}
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
                          className="px-1.5 py-0.5 rounded text-[13px] font-mono glass-blur"
                          style={{
                            backgroundColor: "var(--app-bg-tint, rgba(255,255,255,0.05))",
                            color: "var(--app-text-main, #ffffff)"
                          }}
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    table({ children }) {
                      return (
                        <div
                          className="overflow-x-auto my-6 rounded-xl border animate-in fade-in slide-in-from-bottom-2 duration-500 glass-blur"
                          style={{
                            borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
                            backgroundColor: "var(--app-bg-tint, rgba(255,255,255,0.02))",
                            boxShadow: `0 10px 30px rgba(0,0,0,0.3), 0 0 20px ${primaryColor}05`,
                          }}
                        >
                          <table
                            className="min-w-full divide-y text-[13px]"
                            style={{ borderColor: "var(--app-border-main, rgba(255,255,255,0.1))" }}
                          >
                            {children}
                          </table>
                        </div>
                      );
                    },
                    thead({ children }) {
                      return (
                        <thead
                          style={{ backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.1))" }}
                        >
                          {children}
                        </thead>
                      );
                    },
                    th({ children }) {
                      return (
                        <th
                          className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.15em] font-mono"
                          style={{ color: "var(--app-text-main, #ffffff)" }}
                        >
                          {children}
                        </th>
                      );
                    },
                    tbody({ children }) {
                      return (
                        <tbody
                          className="divide-y"
                          style={{ borderColor: "var(--app-border-main, rgba(255,255,255,0.1))" }}
                        >
                          {children}
                        </tbody>
                      );
                    },
                    tr({ children }) {
                      return (
                        <tr
                          className="transition-colors hover:bg-white/5"
                        >
                          {children}
                        </tr>
                      );
                    },
                    td({ children }) {
                      return (
                        <td
                          className="px-4 py-3 whitespace-nowrap font-medium"
                          style={{ color: "var(--app-text-main, #ffffff)" }}
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
                          className="list-disc pl-5 my-2 space-y-1"
                          style={{ color: "var(--app-text-main, #ffffff)" }}
                        >
                          {children}
                        </ul>
                      );
                    },
                    ol({ children }) {
                      return (
                        <ol
                          className="list-decimal pl-5 my-2 space-y-1"
                          style={{ color: "var(--app-text-main, #ffffff)" }}
                        >
                          {children}
                        </ol>
                      );
                    },
                    blockquote({ children }) {
                      return (
                        <div
                          className="border-l-4 pl-4 py-1 my-4 italic rounded-r-lg glass-blur"
                          style={{ 
                            borderLeftColor: "var(--app-border-main, rgba(255,255,255,0.2))",
                            backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.05))",
                            color: "var(--app-text-muted, #94a3b8)"
                          }}
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
                        {action.variant === "primary" && <Icon name="CheckCircle" size={12} variant="BoldDuotone" className="group-hover/btn:scale-110 transition-transform" /> }
                        {action.variant === "danger" && <Icon name="CloseCircle" size={12} variant="BoldDuotone" className="group-hover/btn:scale-110 transition-transform" /> }
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
                            className="flex items-center gap-1.5 border transition-all text-[10px] px-2.5 py-1.5 rounded-full glass-blur hover:bg-white/10"
                            style={{
                              borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
                              backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.2))",
                              color: "var(--app-text-muted, #94a3b8)"
                            }}
                          >
                            <Icon name="Earth" size={11} variant="BoldDuotone" />
                            <span className="truncate max-w-[150px]">
                              {chunk.web.title || "Source"}
                            </span>
                            <Icon name="Import" size={8} className="opacity-50" />
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
                      <Icon name="Copy" size={12} variant="BoldDuotone" />
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
