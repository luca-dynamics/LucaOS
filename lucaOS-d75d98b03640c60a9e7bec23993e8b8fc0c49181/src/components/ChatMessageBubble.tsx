import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  vscDarkPlus,
  vs,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Copy,
  Terminal,
  ImageIcon,
  Globe,
  ExternalLink,
  Sparkles,
  Pencil,
  Check,
} from "lucide-react";
import { PersonaType } from "../services/lucaService";
import { TacticalLog } from "../types";
import TacticalStream from "./visual/TacticalStream";

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
  persona,
  primaryColor,
  isProcessing,
  attachment,
  generatedImage,
  groundingMetadata,
  wasPruned,
  isStreaming,
  onEdit,
  tacticalData,
}) => {
  const isUser = sender === "user";
  const isSystem = sender === "system";
  const [copiedCodeBlock, setCopiedCodeBlock] = useState<number | null>(null);

  const isLight = persona === "LUCAGENT";

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeBlock(index);
    setTimeout(() => setCopiedCodeBlock(null), 2000);
  };

  // System messages (errors, status updates)
  if (isSystem) {
    return (
      <div className="flex justify-center my-4 animate-in fade-in zoom-in duration-300">
        <div
          className={`text-[10px] font-mono ${isLight ? "text-gray-500 bg-white/50 border-gray-200" : "text-slate-500 bg-slate-900/50 border-slate-800"} px-3 py-1.5 rounded-full border flex items-center gap-2`}
        >
          <Terminal size={10} />
          {text}
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
          <div className="flex-1 min-w-0 w-full">
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

                      if (!inline && match) {
                        // Uniquely identify blocks (simple index via random, though better from props if available)
                        const blockIndex = Math.random();

                        return (
                          <div
                            className={`relative group/code my-4 overflow-hidden rounded-lg border ${isLight ? "border-gray-200 bg-gray-50" : "border-slate-700/50 bg-[#1e1e1e] shadow-sm"}`}
                          >
                            <div
                              className={`flex items-center justify-between px-3 py-1.5 ${isLight ? "bg-gray-100 border-gray-200" : "bg-[#252526] border-white/5"} border-b`}
                            >
                              <span
                                className={`text-[10px] font-mono uppercase tracking-wider font-bold ${isLight ? "text-gray-600" : "text-slate-400"}`}
                              >
                                {match[1]}
                              </span>
                              <button
                                onClick={() =>
                                  handleCopyCode(codeString, blockIndex)
                                }
                                className={`${isLight ? "text-gray-500 hover:text-gray-800" : "text-slate-400 hover:text-white"} transition-colors`}
                                title="Copy Code"
                              >
                                {copiedCodeBlock === blockIndex ? (
                                  <Check size={12} className="text-green-500" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                            <SyntaxHighlighter
                              style={isLight ? vs : vscDarkPlus}
                              language={match[1]}
                              PreTag="div"
                              customStyle={{
                                margin: 0,
                                padding: "1rem",
                                background: "transparent",
                                fontSize: "13px",
                                lineHeight: "1.5",
                              }}
                              {...props}
                            >
                              {codeString}
                            </SyntaxHighlighter>
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
                          className={`overflow-x-auto my-4 rounded-lg border ${isLight ? "border-gray-200 shadow-sm" : "border-slate-700/50"}`}
                        >
                          <table
                            className={`min-w-full divide-y ${isLight ? "divide-gray-200" : "divide-slate-700/50"} text-sm`}
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
                          className={`px-4 py-3 text-left text-xs font-semibold ${isLight ? "text-gray-900" : "text-slate-300"} uppercase tracking-wider`}
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
                          className={`px-4 py-3 whitespace-nowrap ${isLight ? "text-gray-800" : "text-slate-300"}`}
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
                  {text + (isStreaming ? " ▍" : "")}
                </ReactMarkdown>
              </div>

              {/* Tactical Action Block (Inline HUD) */}
              {tacticalData && (
                <div className="my-4 h-64 w-full animate-in zoom-in-95 duration-500 overflow-hidden rounded-xl border border-white/10 shadow-xl">
                  {(() => {
                    const getContextTheme = (type?: string) => {
                      switch (type) {
                        case "FINANCE":
                        case "CRYPTO":
                        case "STOCKS":
                        case "FOREX":
                          return "#eab308"; // Gold
                        case "INTELLIGENCE":
                        case "OSINT":
                          return "#06b6d4"; // Cyan
                        case "SECURITY":
                        case "HACKING":
                        case "TACTICAL":
                          return "#ef4444"; // Red
                        case "SYSTEM":
                          return "#3b82f6"; // Blue
                        default:
                          return primaryColor;
                      }
                    };
                    const blockColor = getContextTheme(tacticalData.type);

                    return (
                      <TacticalStream
                        logs={tacticalData.logs}
                        themeColor={blockColor}
                        title={tacticalData.title || "INLINE_PROCESS_MONITOR"}
                        status={tacticalData.status}
                        isLight={isLight}
                      />
                    );
                  })()}
                </div>
              )}

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
                            className="flex items-center gap-1.5 bg-slate-800/40 border border-slate-700/50 hover:border-slate-500 text-[10px] px-2.5 py-1.5 rounded-full transition-all text-slate-400 hover:text-white hover:bg-slate-800/60"
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
