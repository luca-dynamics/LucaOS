import React, { useState, useEffect } from "react";
import { Icon } from "./ui/Icon";

interface VisualItem {
  title: string;
  imageUrl: string;
  videoUrl?: string; // NEW: Optional video URL
  details: Record<string, string>;
  source?: string;
}

interface VisualDataPresenterProps {
  data: {
    topic: string;
    type:
      | "PRODUCT"
      | "PLACE"
      | "CONCEPT"
      | "GENERAL"
      | "PERSON"
      | "NEWS"
      | "SOCIAL"
      | "DOCUMENT"
      | "SECURITY"
      | "OSINT"
      | "FINANCIAL"
      | "AUDIO"
      | "CODE"
      | "STATS"
      | "TIMELINE"
      | "MAP";
    layout:
      | "GRID"
      | "CAROUSEL"
      | "COMPARISON"
      | "LIST"
      | "TIMELINE"
      | "DASHBOARD"
      | "FULLSCREEN";
    items: VisualItem[];
  };
  theme: {
    primary: string;
    border: string;
    bg: string;
    glow: string;
  };
  onClose: () => void;
  onInteraction?: (type: string, details: any) => void;
  remoteCommand?: {
    type: "NEXT" | "PREV" | "SET_INDEX" | "SCROLL" | string;
    value?: any;
  };
}

const VisualDataPresenter: React.FC<VisualDataPresenterProps> = ({
  data,
  theme,
  onClose,
  onInteraction,
  remoteCommand,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const nextSlide = () => {
    const nextIdx = (activeIndex + 1) % data.items.length;
    setActiveIndex(nextIdx);
    onInteraction?.("SLIDE_CHANGE", { index: nextIdx, item: data.items[nextIdx] });
  };
  const prevSlide = () => {
    const nextIdx = (activeIndex - 1 + data.items.length) % data.items.length;
    setActiveIndex(nextIdx);
    onInteraction?.("SLIDE_CHANGE", { index: nextIdx, item: data.items[nextIdx] });
  };

  // --- REMOTE CONTROL LISTENER ---
  useEffect(() => {
    if (!remoteCommand) return;

    switch (remoteCommand.type) {
      case "NEXT":
        nextSlide();
        break;
      case "PREV":
        prevSlide();
        break;
      case "SET_INDEX":
        if (typeof remoteCommand.value === "number") {
          setActiveIndex(remoteCommand.value % data.items.length);
        }
        break;
      default:
        console.log("[VisualDataPresenter] Unhandled remote command:", remoteCommand);
    }
  }, [remoteCommand]);

  // --- RENDERERS ---

  // --- HOLOGRAPHIC UI COMPONENTS ---
  const HoloCard: React.FC<{
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
  }> = ({ children, className = "", onClick }) => (
    <div
      onClick={onClick}
      className={`relative rounded-[24px] border overflow-hidden group transition-all duration-700 ${className}`}
      style={{
        background: `rgba(0, 0, 0, ${0.4 * (1)})`, // Scaled based on premium glass logic
        borderColor: `${theme.primary}25`,
        boxShadow: `0 20px 40px rgba(0,0,0,0.4), inset 0 0 0 1px ${theme.primary}15`,
        backdropFilter: "blur(40px) saturate(1.8)",
      }}
    >
      {/* Subtle Top Shine */}
      <div
        className="absolute top-0 left-0 w-full h-[1px] opacity-40"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${theme.primary} 50%, transparent 100%)`,
        }}
      />

      {/* Elegant Refractive Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-10 transition-opacity duration-700"
        style={{
          background: `linear-gradient(135deg, white 0%, transparent 50%, black 100%)`,
          mixBlendMode: "soft-light"
        }}
      />

      {children}
    </div>
  );

  const renderGrid = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-8 p-6 max-h-[65vh] overflow-y-auto custom-scrollbar">
      {data.items.map((item, i) => (
        <HoloCard
          key={i}
          className="aspect-square hover:scale-[1.03] active:scale-[0.98] transition-all duration-500 cursor-pointer"
          onClick={() => onInteraction?.("ITEM_SELECT", { index: i, item })}
        >
          {item.videoUrl ? (
            <video
              src={item.videoUrl}
              poster={item.imageUrl}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full p-5">
            <div className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50 text-white mb-1">
              {item.source || data.type}
            </div>
            <div className="text-lg font-medium text-white tracking-tight leading-tight mb-2">
              {item.title}
            </div>
            <div className="flex flex-wrap gap-2">
              {item.details &&
                Object.entries(item.details)
                  .slice(0, 2)
                  .map(([k, v]) => (
                    <div
                      key={k}
                      className="px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[9px] text-white/80 font-medium"
                    >
                      {v}
                    </div>
                  ))}
            </div>
          </div>
        </HoloCard>
      ))}
    </div>
  );

  const renderCarousel = () => (
    <div className="relative w-full h-[55vh] flex items-center justify-center perspective-1000">
      <button
        onClick={prevSlide}
        className="absolute left-2 z-20 p-3 rounded-full bg-black/40 border border-white/10 hover:bg-white/10 hover:border-white/30 text-white transition-all glass-blur"
      >
        <Icon name="ArrowLeft" size={24} />
      </button>

      <HoloCard className="w-full max-w-3xl h-full shadow-[0_0_50px_-10px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-0 transition-opacity duration-500">
          {data.items[activeIndex].videoUrl ? (
            <video
              src={data.items[activeIndex].videoUrl}
              poster={data.items[activeIndex].imageUrl}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={data.items[activeIndex].imageUrl}
              alt={data.items[activeIndex].title}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black/90 to-transparent">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white border border-white/10">
                  Target {activeIndex + 1}/{data.items.length}
                </span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight drop-shadow-lg">
                {data.items[activeIndex].title}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm font-mono text-slate-300 border-t border-white/10 pt-4">
            {Object.entries(data.items[activeIndex].details).map(
              ([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between items-baseline group/row"
                >
                  <span className="opacity-40 text-xs uppercase tracking-widest group-hover/row:text-white transition-colors">
                    {key}
                  </span>
                  <span className="font-bold text-white shadow-black drop-shadow-md">
                    {value}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </HoloCard>

      <button
        onClick={nextSlide}
        className="absolute right-2 z-20 p-3 rounded-full bg-black/40 border border-white/10 hover:bg-white/10 hover:border-white/30 text-white transition-all glass-blur"
      >
        <Icon name="ArrowRight" size={24} />
      </button>

      {/* Holographic Indicators */}
      <div className="absolute bottom-[-30px] flex gap-1.5 p-2 rounded-full bg-black/20 glass-blur border border-white/5">
        {data.items.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === activeIndex
                ? "w-8 bg-white shadow-[0_0_10px_white]"
                : "w-2 bg-white/20 hover:bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );

  const renderComparison = () => (
    <div className="flex gap-6 p-4 overflow-x-auto custom-scrollbar min-h-[55vh] items-center px-12">
      {data.items.map((item, i) => (
        <HoloCard
          key={i}
          className="min-w-[320px] h-[500px] flex flex-col hover:scale-[1.02] hover:-translate-y-2 transition-transform duration-500 shadow-2xl"
        >
          {/* Image Header */}
          <div className="h-48 relative overflow-hidden bg-white/5 group-hover:h-52 transition-all duration-500">
            {item.videoUrl ? (
              <video
                src={item.videoUrl}
                poster={item.imageUrl}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/90" />

            <div className="absolute bottom-4 left-5 right-5">
              <div className="text-xl font-bold text-white leading-tight drop-shadow-md">
                {item.title}
              </div>
              <div className="w-12 h-0.5 mt-2 bg-white/50" />
            </div>
          </div>

          {/* Specs List */}
          <div className="flex-1 p-5 space-y-4 overflow-y-auto custom-scrollbar bg-black/20">
            {Object.entries(item.details).map(([key, value], idx) => (
              <div key={idx} className="group/spec">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500 group-hover/spec:text-cyan-400 transition-colors">
                    {key}
                  </div>
                  <div className="h-px flex-1 mx-2 bg-white/10 group-hover/spec:bg-cyan-900/50 transition-colors" />
                </div>
                <div className="text-sm font-mono text-white/90 pl-1">
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-white/5 bg-white/[0.02] flex justify-between items-center glass-blur">
            <div className="flex items-center gap-2">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  i === 0 ? "bg-green-500 animate-pulse" : "bg-slate-500"
                }`}
              />
              <div className="text-[10px] font-mono text-slate-500 uppercase">
                {item.source || "Source: Luca Net"}
              </div>
            </div>
            <div className="p-2 rounded bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-400 cursor-pointer transition-all border border-transparent hover:border-cyan-500/30">
              <Icon name="ExternalLink" size={14} />
            </div>
          </div>
        </HoloCard>
      ))}
    </div>
  );

  // --- LIST LAYOUT (Vertical list view) ---
  const renderList = () => (
    <div className="w-full max-w-2xl mx-auto space-y-3 p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
      {data.items.map((item, i) => (
        <div
          key={i}
          className="relative flex items-center gap-4 p-4 rounded-xl overflow-hidden cursor-pointer group transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 100%)`,
            border: `1px solid ${theme.primary}30`,
            boxShadow: `0 0 20px ${theme.primary}10, inset 0 0 15px ${theme.primary}05`,
            backdropFilter: "blur(15px)",
          }}
        >
          {/* Hover Glow Effect */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{
              background: `linear-gradient(90deg, ${theme.primary}10 0%, transparent 100%)`,
              borderLeft: `2px solid ${theme.primary}`,
            }}
          />
          {item.imageUrl && (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-16 h-16 rounded-lg object-cover opacity-80 group-hover:opacity-100 transition-opacity border"
              style={{ borderColor: `${theme.primary}40` }}
            />
          )}
          <div className="flex-1 min-w-0 relative z-10">
            <div className="text-sm font-bold text-white truncate tracking-wide">
              {item.title}
            </div>
            {item.details &&
              Object.entries(item.details)
                .slice(0, 2)
                .map(([k, v]) => (
                  <div
                    key={k}
                    className="text-[10px] text-slate-400 font-mono truncate"
                  >
                    <span className="text-white/40 uppercase mr-2">{k}</span>
                    <span style={{ color: theme.primary }}>{v}</span>
                  </div>
                ))}
          </div>
          <Icon
            name="ChevronRight"
            size={16}
            className="relative z-10 transition-colors opacity-30 group-hover:opacity-100 group-hover:translate-x-1"
            style={{ color: theme.primary }}
          />
        </div>
      ))}
    </div>
  );

  // --- TIMELINE LAYOUT (Horizontal timeline) ---
  const renderTimeline = () => (
    <div className="w-full p-8 max-h-[65vh] overflow-x-auto custom-scrollbar">
      <div className="relative flex items-start gap-12 min-w-max pb-8">
        {/* Glowing Timeline Line */}
        <div
          className="absolute top-10 left-0 right-0 h-[1px] opacity-20"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${theme.primary} 20%, ${theme.primary} 80%, transparent 100%)`,
          }}
        />
        {data.items.map((item, i) => (
          <div
            key={i}
            className="relative flex flex-col items-center w-64 group"
          >
            {/* Animated Node */}
            <div
              className="w-4 h-4 rounded-full z-10 border-[3px] transition-all duration-500 group-hover:scale-125"
              style={{
                backgroundColor: "#000",
                borderColor: theme.primary,
                boxShadow: `0 0 20px ${theme.primary}40`,
              }}
            />
            {/* Timeline Card */}
            <HoloCard
              className="mt-6 p-5 w-full hover:translate-y-[-8px]"
            >
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-32 rounded-xl object-cover mb-4 transition-transform duration-700 group-hover:scale-105"
                />
              )}
              <div className="text-lg font-medium text-white tracking-tight leading-tight mb-2">
                {item.title}
              </div>
              {item.details?.date && (
                <div
                  className="text-[10px] font-bold tracking-[0.1em] uppercase opacity-60 flex items-center gap-2"
                  style={{ color: theme.primary }}
                >
                  <Icon name="Clock" size={12} />
                  {item.details.date}
                </div>
              )}
            </HoloCard>
          </div>
        ))}
      </div>
    </div>
  );

  // --- DASHBOARD LAYOUT (Multi-panel) ---
  const renderDashboard = () => (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 p-6 max-h-[65vh] overflow-y-auto custom-scrollbar">
      {data.items.map((item, i) => (
        <HoloCard
          key={i}
          className="p-6 flex flex-col hover:scale-[1.02]"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold tracking-[0.2em] uppercase opacity-40 text-white mb-1">
                RESOURCE_{i.toString().padStart(2, '0')}
              </span>
              <h3 className="text-xl font-medium text-white tracking-tight">
                {item.title}
              </h3>
            </div>
            <div
              className="w-2 h-2 rounded-full shadow-[0_0_10px_currentcolor]"
              style={{ backgroundColor: theme.primary, color: theme.primary }}
            />
          </div>

          {/* Stats Grid */}
          <div className="space-y-4">
            {item.details &&
              Object.entries(item.details).map(([k, v]) => (
                <div
                  key={k}
                  className="flex flex-col gap-1 border-l-2 pl-3"
                  style={{ borderColor: `${theme.primary}20` }}
                >
                  <span className="text-[9px] text-white/30 uppercase font-bold tracking-widest">
                    {k}
                  </span>
                  <span
                    className="text-lg font-medium tracking-tight"
                    style={{ color: theme.primary }}
                  >
                    {v}
                  </span>
                </div>
              ))}
          </div>
        </HoloCard>
      ))}
    </div>
  );

  // --- FULLSCREEN LAYOUT (Single item) ---
  const renderFullscreen = () => {
    const item = data.items[activeIndex] || data.items[0];
    if (!item) return null;
    return (
      <div className="relative w-full h-[65vh] flex items-center justify-center p-8">
        {/* Immersive Glass Frame */}
        <HoloCard
          className="relative max-w-5xl w-full h-full flex flex-col md:flex-row overflow-hidden shadow-2xl"
        >
          <div className="flex-1 relative bg-black/40">
            {item.videoUrl ? (
              <video
                src={item.videoUrl}
                poster={item.imageUrl}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-contain"
              />
            ) : item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Icon name="Image" size={64} className="opacity-10" />
              </div>
            )}
          </div>

          <div className="w-full md:w-80 p-8 flex flex-col justify-center border-l border-white/5 bg-white/[0.02] backdrop-blur-xl">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-40 text-white mb-2">
              FEATURED_DATA
            </span>
            <h2 className="text-3xl font-medium text-white tracking-tight mb-6 leading-tight">
              {item.title}
            </h2>
            
            <div className="space-y-6">
              {item.details &&
                Object.entries(item.details).map(([k, v]) => (
                  <div key={k} className="flex flex-col gap-1 border-l-2 pl-4" style={{ borderColor: `${theme.primary}30` }}>
                    <span className="text-[9px] text-white/30 uppercase font-bold tracking-widest">{k}</span>
                    <span className="text-sm font-medium text-white/90">{v}</span>
                  </div>
                ))}
            </div>
          </div>
        </HoloCard>

        {/* Navigation Overlays */}
        {data.items.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-12 p-5 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:scale-110 active:scale-95 transition-all backdrop-blur-2xl"
            >
              <Icon name="ArrowLeft" size={28} />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-12 p-5 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:scale-110 active:scale-95 transition-all backdrop-blur-2xl"
            >
              <Icon name="ArrowRight" size={28} />
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div
      className={`w-full max-w-6xl mx-auto pointer-events-auto animate-in fade-in zoom-in-95 duration-700 ${
        isLoaded ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-12 px-6">
        <div className="flex items-center gap-6">
          <div 
            className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-3xl shadow-2xl"
            style={{ boxShadow: `0 10px 30px -10px ${theme.primary}20` }}
          >
            {data.type === "PLACE" ? (
              <Icon name="MapPin" size={24} style={{ color: theme.primary }} />
            ) : data.type === "PRODUCT" ? (
              <Icon name="Box" size={24} style={{ color: theme.primary }} />
            ) : data.type === "PERSON" ? (
              <Icon name="User" size={24} style={{ color: theme.primary }} />
            ) : data.type === "NEWS" ? (
              <Icon name="Newspaper" size={24} style={{ color: theme.primary }} />
            ) : data.type === "SOCIAL" ? (
              <Icon name="Share2" size={24} style={{ color: theme.primary }} />
            ) : data.type === "DOCUMENT" ? (
              <Icon name="FileText" size={24} style={{ color: theme.primary }} />
            ) : data.type === "FINANCIAL" ? (
              <Icon name="TrendingUp" size={24} style={{ color: theme.primary }} />
            ) : data.type === "AUDIO" ? (
              <Icon name="Music" size={24} style={{ color: theme.primary }} />
            ) : data.type === "CODE" ? (
              <Icon name="Code" size={24} style={{ color: theme.primary }} />
            ) : data.type === "STATS" ? (
              <Icon name="BarChart3" size={24} style={{ color: theme.primary }} />
            ) : data.type === "TIMELINE" ? (
              <Icon name="Clock" size={24} style={{ color: theme.primary }} />
            ) : data.type === "MAP" ? (
              <Icon name="Map" size={24} style={{ color: theme.primary }} />
            ) : (
              <Icon name="Layers" size={24} style={{ color: theme.primary }} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-1 h-1 rounded-full bg-white/20" />
                ))}
              </div>
              <div className="text-[10px] font-bold text-white/40 tracking-[0.3em] uppercase">
                {data.layout} {/* NODE_SYNC: ACTIVE */}
              </div>
            </div>
            <div className="text-4xl font-medium text-white tracking-tight">
              {data.topic}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="group relative p-3 rounded-full hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-transparent hover:border-red-500/40 transition-all duration-300"
        >
          <Icon name="X" size={20} />
          {/* Tech Ring on Hover */}
          <div className="absolute inset-0 rounded-full border border-red-500/0 scale-75 group-hover:scale-100 group-hover:border-red-500/50 transition-all duration-500" />
        </button>
      </div>

      {/* Content Area */}
      <div className="relative min-h-[60vh] flex items-center justify-center">
        <div className="flex-1 overflow-hidden pointer-events-auto">
          {data.layout === "GRID" && renderGrid()}
          {data.layout === "CAROUSEL" && renderCarousel()}
          {data.layout === "COMPARISON" && renderComparison()}
          {data.layout === "LIST" && renderList()}
          {data.layout === "TIMELINE" && renderTimeline()}
          {data.layout === "DASHBOARD" && renderDashboard()}
          {data.layout === "FULLSCREEN" && renderFullscreen()}
        </div>
      </div>
    </div>
  );
};

export default VisualDataPresenter;
