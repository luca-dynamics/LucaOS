import React from "react";

/**
 * Maps an AI model ID or name to brand-specific visual metadata.
 */
export const getAgentLogo = (aiModelId: string) => {
  const id = (aiModelId || "").toLowerCase();
  
  // Anthropic / Claude
  if (id.includes("claude")) {
    return { 
      letter: "C", 
      color: "text-[#D97757]", // Claude Orange
      bg: "bg-[#D97757]/10", 
      border: "border-[#D97757]/20", 
      icon: "/trading/icons/claude.svg" 
    };
  }
  
  // DeepSeek / R1
  if (id.includes("deepseek") || id.includes("r1")) {
    return { 
      letter: "D", 
      color: "text-[#4D94FF]", 
      bg: "bg-[#4D94FF]/10", 
      border: "border-[#4D94FF]/20",
      icon: "/trading/icons/deepseek.svg"
    };
  }
  
  // OpenAI / GPT / o1
  if (id.includes("gpt") || id.includes("openai") || id.includes("o1")) {
    return { 
      letter: "O", 
      color: "text-[#10a37f]", 
      bg: "bg-[#10a37f]/10", 
      border: "border-[#10a37f]/20", 
      icon: "/trading/icons/openai.svg" 
    };
  }
  
  // Meta / Llama
  if (id.includes("llama") || id.includes("meta")) {
    return { 
      letter: "L", 
      color: "text-[#0668E1]", 
      bg: "bg-[#0668E1]/10", 
      border: "border-[#0668E1]/20"
    };
  }

  // Microsoft / Phi
  if (id.includes("phi") || id.includes("microsoft")) {
    return { 
      letter: "P", 
      color: "text-[#00A4EF]", 
      bg: "bg-[#00A4EF]/10", 
      border: "border-[#00A4EF]/20"
    };
  }

  // HuggingFace / SmolLM
  if (id.includes("smollm") || id.includes("huggingface")) {
    return { 
      letter: "S", 
      color: "text-[#FFD21E]", 
      bg: "bg-[#FFD21E]/10", 
      border: "border-[#FFD21E]/20"
    };
  }
  
  // Google / Gemini / Gemma
  if (id.includes("gemini") || id.includes("gemma")) {
    return { 
      letter: "G", 
      color: "text-[#4E8BF5]", 
      bg: "bg-[#4E8BF5]/10", 
      border: "border-[#4E8BF5]/20", 
      icon: "/trading/icons/gemini.svg" 
    };
  }

  // Grok / xAI
  if (id.includes("grok") || id.includes("xai")) {
    return {
      letter: "X",
      color: "text-white",
      bg: "bg-white/10",
      border: "border-white/20",
      icon: "/trading/icons/grok.svg"
    };
  }

  // Kimi / Moonshot
  if (id.includes("kimi") || id.includes("moonshot")) {
    return {
      letter: "K",
      color: "text-[#8B5CF6]",
      bg: "bg-[#8B5CF6]/10",
      border: "border-[#8B5CF6]/20",
      icon: "/trading/icons/kimi.svg"
    };
  }

  // Qwen / Alibaba
  if (id.includes("qwen") || id.includes("alibaba")) {
    return {
      letter: "Q",
      color: "text-[#8E4DFF]",
      bg: "bg-[#8E4DFF]/10",
      border: "border-[#8E4DFF]/20",
      icon: "/trading/icons/qwen.svg"
    };
  }
  
  // Default fallback
  return { 
    letter: (aiModelId || "?").charAt(0).toUpperCase(), 
    color: "text-slate-400", 
    bg: "bg-slate-500/10", 
    border: "border-slate-500/20" 
  };
};

/**
 * A branded LUCA logo avatar that uses color overlays to identify distinct AI agents.
 */
export const LucaAvatar = ({ aiModelId, size = 32 }: { aiModelId: string; size?: number }) => {
  const logo = getAgentLogo(aiModelId);
  
  if (logo.icon) {
    return (
      <div 
        className={`relative flex items-center justify-center rounded border bg-[#0d0d0d] overflow-hidden transition-all shrink-0 hover:border-white/30 ${logo.border}`} 
        style={{ width: size, height: size }}
      >
        <img 
          src={logo.icon} 
          alt={aiModelId} 
          className="w-[70%] h-[70%] object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]" 
        />
        <div className={`absolute bottom-0 right-0 w-1/3 h-[2px] ${logo.bg.replace('/10', '/80')}`} />
      </div>
    );
  }

  return (
    <div 
      className={`relative flex items-center justify-center rounded border bg-[#050505] overflow-hidden transition-all shrink-0 ${logo.border}`} 
      style={{ width: size, height: size }}
    >
      {/* Brand color wash */}
      <div className={`absolute inset-0 opacity-10 ${logo.bg}`} />
      
      {/* LUCA Logo Core */}
      <img 
        src="/icon.png" 
        alt="LUCA" 
        className="w-[70%] h-[70%] object-contain filter grayscale invert opacity-50 transition-opacity" 
      />
      
      {/* Brand Badge Overlay (C/D/O) */}
      <div className={`absolute top-0 right-0 px-0.5 rounded-bl border-b border-l border-white/5 bg-black/40 text-[7px] font-black ${logo.color}`}>
        {logo.letter}
      </div>
    </div>
  );
};
