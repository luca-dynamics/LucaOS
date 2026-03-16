import React, { useEffect, useState } from "react";
import {
  X,
  MessageSquare,
  User,
  Send,
  Wifi,
  Phone,
  Video,
  Paperclip,
} from "lucide-react";
import QRCode from "qrcode";
import { apiUrl } from "../config/api";
import { setHexAlpha } from "../config/themeColors";

interface Props {
  onClose: () => void;
  theme: {
    hex: string;
    primary: string;
    border: string;
    bg: string;
    themeName?: string;
    isLight?: boolean;
  };
}

const WhatsAppManager: React.FC<Props> = ({ onClose, theme }) => {
  const themePrimary = theme?.primary || "text-emerald-500";
  const themeHex = theme?.hex || "#10b981";
  const isLight = theme?.isLight || theme?.themeName?.toLowerCase() === "lucagent";

  const [status, setStatus] = useState("INIT");
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const [uptime, setUptime] = useState("--:--:--");
  const [messageCount, setMessageCount] = useState<number | null>(null);

  // Poll status
  useEffect(() => {
    // Try to start the client if not running (Lazy Load)
    startWhatsApp();

    const interval = setInterval(checkStatus, 3000);
    checkStatus();
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (ms: number) => {
    if (!ms || ms <= 0) return "--:--:--";
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const startWhatsApp = async () => {
    try {
      await fetch(apiUrl("/api/whatsapp/start"), {
        method: "POST",
      });
    } catch {
      console.error("Failed to start WhatsApp service");
    }
  };

  const checkStatus = async () => {
    try {
      const res = await fetch(apiUrl("/api/whatsapp/status"));
      const data = await res.json();
      setStatus(data.status.status);

      if (data.uptime) setUptime(formatUptime(data.uptime));
      if (data.messageCount !== undefined) setMessageCount(data.messageCount);

      if (data.status === "SCAN_QR" && data.qr) {
        QRCode.toDataURL(data.qr, {
          margin: 2,
          scale: 5,
          color: { dark: isLight ? "#000000" : themeHex, light: isLight ? "#ffffff" : "#00000000" },
        }).then((url: string) => setQrImage(url));
      } else {
        setQrImage(null);
      }

      if (
        (data.status.status === "READY" ||
          data.status.status === "AUTHENTICATED") &&
        chats.length === 0
      ) {
        fetchChats();
      }
    } catch {
      setStatus("ERROR_OFFLINE");
    }
  };

  const fetchChats = async () => {
    try {
      const res = await fetch(apiUrl("/api/whatsapp/chats"));
      const data = await res.json();
      if (data.chats && Array.isArray(data.chats)) {
        setChats(data.chats);
      } else if (Array.isArray(data)) {
        setChats(data);
      } else {
        setChats([]);
      }
    } catch {
      console.error("Failed to fetch chats");
    }
  };

  const sendMessage = () => {
    if (input.trim()) {
      const newMessage = {
        id: messages.length + 1,
        sender: "me",
        text: input,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages([...messages, newMessage]);
      setInput("");
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-0 sm:p-4 overflow-y-auto sm:overflow-hidden">
      <div
        className={`w-full h-auto min-h-[50vh] max-h-[90vh] sm:w-[95%] sm:h-[85vh] max-w-5xl rounded-none sm:rounded-lg flex flex-col sm:flex-row overflow-hidden relative my-auto sm:my-0 ${isLight ? "glass-panel-light" : "bg-black/60 backdrop-blur-xl"}`}
        style={{
          boxShadow: isLight ? `0 20px 50px ${setHexAlpha(themeHex, 0.1)}` : `0 0 50px ${themeHex}1a`,
          borderColor: setHexAlpha(themeHex, isLight ? 0.2 : 0.3),
          borderWidth: "1px",
          borderStyle: "solid",
        }}
      >
        {/* Header */}
        <div
          className={`h-16 flex items-center justify-between px-6 absolute top-0 left-0 right-0 z-50 transition-colors`}
          style={{
            borderBottom: `1px solid ${setHexAlpha(themeHex, isLight ? 0.1 : 0.3)}`,
            backgroundColor: isLight ? "rgba(255,255,255,0.8)" : setHexAlpha(themeHex, 0.05),
          }}
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setShowMobileSidebar(!showMobileSidebar)}
              className={`sm:hidden p-2 rounded ${isLight ? "hover:bg-black/5 text-slate-600" : "hover:bg-white/5 text-slate-400"}`}
            >
              <MessageSquare size={20} />
            </button>
            <div
              className={`p-2 hidden sm:block rounded ${themePrimary}`}
              style={{
                border: `1px solid ${isLight ? "rgba(0,0,0,0.1)" : setHexAlpha(themeHex, 0.5)}`,
                backgroundColor: isLight ? "rgba(0,0,0,0.03)" : setHexAlpha(themeHex, 0.1),
              }}
            >
              <MessageSquare size={24} />
            </div>
            <div>
              <h2 className={`font-display text-lg sm:text-xl font-bold tracking-widest leading-none sm:leading-normal ${isLight ? "text-slate-900" : "text-white"}`}>
                LUCA LINK
              </h2>
              <div
                className={`text-[9px] sm:text-[10px] font-mono ${themePrimary} flex gap-2 sm:gap-4`}
              >
                <span className="hidden xs:inline">WHATSAPP GATEWAY</span>
                <span>STATUS: {status}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`transition-colors ${isLight ? "text-slate-400 hover:text-slate-900" : "text-slate-500 hover:text-white"}`}
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row w-full h-full pt-16 relative">
          {/* Left Panel: Connection & Status */}
          <div
            className={`
              absolute inset-0 z-[60] sm:relative sm:inset-auto sm:z-auto
              w-full sm:w-80 flex flex-col transition-transform duration-300
              ${isLight ? "bg-white/95 sm:bg-white/40" : "bg-black/95 sm:bg-black/40"}
              ${showMobileSidebar ? "translate-x-0" : "-translate-x-full sm:translate-x-0"}
            `}
            style={{
              borderRight: `1px solid ${setHexAlpha(themeHex, isLight ? 0.1 : 0.3)}`,
            }}
          >
            <div className="p-6 flex-1 flex flex-col items-center">
              <div className="w-full space-y-4 flex-1 flex flex-col items-center justify-center">
                <div
                  className={`p-6 rounded-xl flex flex-col items-center justify-center text-center w-full aspect-square max-w-[280px]`}
                  style={{
                    border: `1px solid ${setHexAlpha(themeHex, isLight ? 0.1 : 0.2)}`,
                    backgroundColor: isLight ? "rgba(0,0,0,0.02)" : "black",
                  }}
                >
                  {status === "READY" || status === "AUTHENTICATED" ? (
                    <>
                      <div
                        className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 animate-pulse`}
                        style={{
                          backgroundColor: isLight ? setHexAlpha(themeHex, 0.1) : setHexAlpha(themeHex, 0.15),
                        }}
                      >
                        <Wifi size={40} className={themePrimary} />
                      </div>
                      <div className={`${themePrimary} font-bold text-base tracking-widest`}>
                        LINK ESTABLISHED
                      </div>
                      <div className="text-xs text-slate-500 mt-1 uppercase font-mono tracking-tighter">
                        End-to-End Encrypted
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={`w-full h-auto max-w-[200px] aspect-square p-3 mb-4 rounded-lg flex items-center justify-center ${isLight ? "bg-black" : "bg-white"}`}>
                        {qrImage ? (
                          <img
                            src={qrImage}
                            alt="QR Code"
                            className={`w-full h-full object-contain rendering-pixelated ${isLight ? "invert" : ""}`}
                          />
                        ) : (
                          <div className="w-full h-full bg-[url('https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=Loading...')] bg-cover rendering-pixelated opacity-80"></div>
                        )}
                      </div>
                      <div className="text-slate-400 text-[10px] font-mono tracking-[0.2em] animate-pulse uppercase">
                        SCAN TO AUTHENTICATE
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>UPTIME</span>
                    <span className={themePrimary}>{uptime}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>MESSAGES</span>
                    <span className={themePrimary}>
                      {messageCount !== null
                        ? messageCount.toLocaleString()
                        : "--"}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>LATENCY</span>
                    <span className={themePrimary}>--</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact List */}
            <div className="flex-1 overflow-y-auto p-2">
              <div className={`p-2 sm:hidden flex justify-between items-center mb-2`} style={{ borderBottom: `1px solid ${setHexAlpha(themeHex, isLight ? 0.05 : 0.1)}` }}>
                <span className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">
                  Select Chat
                </span>
                <button
                  onClick={() => setShowMobileSidebar(false)}
                  className="text-slate-500"
                >
                  <X size={16} />
                </button>
              </div>
              {chats.length > 0 ? (
                chats.map((chat, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      if (window.innerWidth < 640) setShowMobileSidebar(false);
                      // In a full implementation, you'd select the chat here
                    }}
                    className={`p-3 rounded cursor-pointer flex items-center gap-3 mb-1 transition-colors ${isLight ? "hover:bg-black/5" : "hover:bg-white/5"}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isLight ? "bg-slate-200 text-slate-600" : "bg-slate-800 text-slate-400"}`}>
                      {chat.name ? chat.name[0] : "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-bold truncate ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                        {chat.name || chat.id.user}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        Last seen today...
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-slate-500 text-sm">
                  No chats available.
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Chat Interface */}
          <div className={`flex-1 flex flex-col relative min-h-[400px] sm:min-h-0 ${isLight ? "bg-white/50" : "bg-[#050505]"}`}>
            {/* Chat Header */}
            <div
              className={`h-16 flex items-center px-6 justify-between ${isLight ? "bg-white/30" : "bg-[#080808]"}`}
              style={{ borderBottom: `1px solid ${setHexAlpha(themeHex, isLight ? 0.05 : 0.2)}` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center`}
                  style={{
                    border: `1px solid ${setHexAlpha(themeHex, isLight ? 0.1 : 0.3)}`,
                    backgroundColor: isLight ? "rgba(0,0,0,0.03)" : setHexAlpha(themeHex, 0.1),
                  }}
                >
                  <User size={16} className={themePrimary} />
                </div>
                <div>
                  <div className={`text-sm font-bold ${isLight ? "text-slate-900" : "text-white"}`}>OPERATOR</div>
                  <div
                    className={`text-[10px] ${themePrimary} flex items-center gap-1`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        status === "READY"
                          ? `animate-pulse`
                          : "bg-slate-500"
                      }`}
                      style={{
                        backgroundColor: status === "READY" ? themeHex : "#64748b",
                        boxShadow: status === "READY" ? `0 0 5px ${themeHex}` : "none",
                      }}
                    ></span>{" "}
                    {status === "READY" ? "ONLINE" : "OFFLINE"}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className={`p-2 rounded transition-colors ${isLight ? "hover:bg-black/5 text-slate-400" : "hover:bg-white/5 text-slate-500"}`}>
                  <Phone size={16} />
                </button>
                <button className={`p-2 rounded transition-colors ${isLight ? "hover:bg-black/5 text-slate-400" : "hover:bg-white/5 text-slate-500"}`}>
                  <Video size={16} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div
              className={`flex-1 overflow-y-auto p-6 space-y-4`}
              style={{
                backgroundColor: isLight ? "#ffffff" : "#1a1a1aff",
                backgroundImage: `url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')`,
                backgroundBlendMode: isLight ? "overlay" : "multiply",
                filter: isLight ? "none" : "invert(1) brightness(0.2) contrast(1.2)",
                backgroundSize: "400px",
              }}
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.sender === "me" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg text-sm ${
                      msg.sender === "me"
                        ? `rounded-tr-none ${isLight ? "bg-white/80 text-slate-900 shadow-sm" : "text-green-100"}`
                        : `rounded-tl-none ${isLight ? "bg-slate-100 border-slate-200 text-slate-800" : "bg-slate-900/50 border-slate-700 text-slate-300"}`
                    }`}
                    style={msg.sender === "me" ? {
                      border: `1px solid ${isLight ? "rgba(0,0,0,0.1)" : setHexAlpha(themeHex, 0.3)}`,
                      backgroundColor: isLight ? undefined : setHexAlpha(themeHex, 0.1),
                    } : {}}
                  >
                    {msg.text}
                    <div
                      className={`text-[9px] mt-1 text-right ${
                        msg.sender === "me"
                          ? `${themePrimary} opacity-50`
                          : "text-slate-500"
                      }`}
                    >
                      {msg.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className={`p-4`} style={{
              borderTop: `1px solid ${isLight ? "rgba(0,0,0,0.05)" : setHexAlpha(themeHex, 0.2)}`,
              backgroundColor: isLight ? "rgba(255,255,255,0.4)" : "#080808",
            }}>
              <div
                className={`flex items-center gap-2 rounded-full px-4 py-2 ${isLight ? "bg-white border-slate-200 shadow-inner" : "bg-black"}`}
                style={{ border: `1px solid ${isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"}` }}
              >
                <button
                  className={`transition-colors ${isLight ? "text-slate-400 hover:text-slate-900" : "text-slate-500 hover:text-white"}`}
                  style={{ color: isLight ? undefined : "#64748b" }}
                >
                  <Paperclip size={18} />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className={`flex-1 bg-transparent border-none outline-none text-sm placeholder-slate-600 ${isLight ? "text-slate-900" : "text-white"}`}
                />
                <button onClick={sendMessage} className={themePrimary}>
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppManager;
