import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Copy,
  ImageIcon,
  Video,
  Check,
  ExternalLink,
  Globe,
  Sparkles,
} from "lucide-react";

interface ChatMessage {
  sender: "user" | "luca";
  text: string;
  attachment?: string | null;
  generatedImage?: string | null;
  generatedVideo?: string | null;
  isStreaming?: boolean;
  id?: string;
}

interface ChatWidgetHistoryProps {
  history: ChatMessage[];
  isProcessing: boolean;
  primaryColor: string;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

const ChatWidgetHistory: React.FC<ChatWidgetHistoryProps> = ({
  history,
  isProcessing,
  primaryColor,
  messagesEndRef,
}) => {
  const [copiedCodeBlock, setCopiedCodeBlock] = useState<number | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeBlock(index);
    setTimeout(() => setCopiedCodeBlock(null), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">
      {history.map((msg, idx) => {
        const isUser = msg.sender === "user";

        return (
          <div
            key={idx}
            className={`flex ${
              isUser ? "justify-end" : "justify-start"
            } relative z-10 group`}
          >
            <div
              className={`max-w-full rounded-xl px-3 py-1.5 text-[13px] transition-all duration-300 relative overflow-hidden ${
                isUser ? "rounded-tr-sm" : "rounded-tl-sm"
              }`}
              style={{
                backgroundColor: isUser
                  ? `${primaryColor}1A`
                  : "rgba(30, 41, 59, 0.6)",
                border: `1px solid ${
                  isUser ? `${primaryColor}33` : "rgba(255, 255, 255, 0.08)"
                }`,
              }}
            >
              {/* User Attachment Preview */}
              {msg.attachment && isUser && (
                <div className="mb-2 overflow-hidden rounded-lg border border-white/10">
                  <img
                    src={
                      msg.attachment.startsWith("data:")
                        ? msg.attachment
                        : `data:image/jpeg;base64,${msg.attachment}`
                    }
                    alt="Attachment"
                    className="max-h-32 w-auto rounded-lg object-cover"
                  />
                </div>
              )}

              {/* AI Generated Image */}
              {msg.generatedImage && !isUser && (
                <div className="mb-3 overflow-hidden rounded-lg border border-slate-700/50 bg-black/20">
                  <div className="px-2 py-1 bg-white/5 text-[9px] text-slate-400 font-bold tracking-widest border-b border-white/5 flex items-center gap-1.5">
                    <ImageIcon size={10} style={{ color: primaryColor }} />
                    GENERATED
                  </div>
                  <img
                    src={
                      msg.generatedImage.startsWith("data:")
                        ? msg.generatedImage
                        : `data:image/jpeg;base64,${msg.generatedImage}`
                    }
                    alt="AI Generated"
                    className="max-h-40 w-auto object-contain"
                  />
                </div>
              )}

              {/* Text Content with Rich Markdown */}
              <div className="prose prose-invert prose-sm max-w-none leading-relaxed font-sans text-slate-200">
                {isUser ? (
                  <div className="whitespace-pre-wrap font-sans">
                    {msg.text}
                  </div>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({
                        node,
                        inline,
                        className,
                        children,
                        ...props
                      }: any) {
                        const match = /language-(\w+)/.exec(className || "");
                        const codeString = String(children).replace(/\n$/, "");

                        if (!inline && match) {
                          const blockIndex = idx * 1000 + Math.random();
                          return (
                            <div className="relative group/code my-3 overflow-hidden rounded-lg border border-slate-700/50 shadow-sm bg-[#1e1e1e]">
                              <div className="flex items-center justify-between px-3 py-1.5 bg-[#252526] border-b border-white/5">
                                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
                                  {match[1]}
                                </span>
                                <button
                                  onClick={() =>
                                    handleCopyCode(codeString, blockIndex)
                                  }
                                  className="text-slate-400 hover:text-white transition-colors"
                                  title="Copy Code"
                                >
                                  {copiedCodeBlock === blockIndex ? (
                                    <Check
                                      size={12}
                                      className="text-green-400"
                                    />
                                  ) : (
                                    <Copy size={12} />
                                  )}
                                </button>
                              </div>
                              <SyntaxHighlighter
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                customStyle={{
                                  margin: 0,
                                  padding: "0.8rem",
                                  background: "transparent",
                                  fontSize: "11px",
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
                            className="bg-slate-800/60 px-1.5 py-0.5 rounded text-[11px] font-mono text-emerald-300"
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      },
                      table({ children }) {
                        return (
                          <div className="overflow-x-auto my-3 rounded-lg border border-slate-700/50">
                            <table className="min-w-full divide-y divide-slate-700/50 text-xs text-slate-300">
                              {children}
                            </table>
                          </div>
                        );
                      },
                      thead({ children }) {
                        return (
                          <thead className="bg-slate-800/50">{children}</thead>
                        );
                      },
                      th({ children }) {
                        return (
                          <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                            {children}
                          </th>
                        );
                      },
                      tbody({ children }) {
                        return (
                          <tbody className="divide-y divide-slate-700/50 bg-slate-900/20">
                            {children}
                          </tbody>
                        );
                      },
                      tr({ children }) {
                        return (
                          <tr className="hover:bg-white/5 transition-colors">
                            {children}
                          </tr>
                        );
                      },
                      td({ children }) {
                        return (
                          <td className="px-3 py-2 whitespace-nowrap text-slate-300 border-b border-slate-700/30">
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
                          <ul className="list-disc pl-4 my-1 space-y-0.5 text-slate-300 marker:text-slate-500">
                            {children}
                          </ul>
                        );
                      },
                      ol({ children }) {
                        return (
                          <ol className="list-decimal pl-4 my-1 space-y-0.5 text-slate-300 marker:text-slate-500">
                            {children}
                          </ol>
                        );
                      },
                      blockquote({ children }) {
                        return (
                          <div className="border-l-2 border-slate-700 pl-3 py-0.5 my-2 italic text-slate-400 bg-slate-800/10 rounded-r-md">
                            {children}
                          </div>
                        );
                      },
                    }}
                  >
                    {msg.text + (msg.isStreaming ? " ▍" : "")}
                  </ReactMarkdown>
                )}
              </div>

              {/* Copy Button (AI messages only) */}
              {!isUser && (
                <button
                  onClick={() => handleCopy(msg.text)}
                  className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10 text-slate-500 hover:text-slate-300"
                  title="Copy"
                >
                  <Copy size={11} />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="flex justify-start">
          <div className="flex gap-1 items-center bg-slate-800/50 rounded-lg px-3 py-2 border border-white/10 relative z-10">
            <span
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ backgroundColor: primaryColor }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ backgroundColor: primaryColor, animationDelay: "75ms" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ backgroundColor: primaryColor, animationDelay: "150ms" }}
            />
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatWidgetHistory;
