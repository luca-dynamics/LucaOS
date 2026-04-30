import React, { useState, useEffect, useCallback } from "react";

interface PanelResizerProps {
  onResize: (delta: number) => void;
  themeColor: string;
  className?: string;
  isRight?: boolean;
}

const PanelResizer: React.FC<PanelResizerProps> = ({
  onResize,
  themeColor,
  className = "",
  isRight = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleTouchStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      // For left panels, positive movement increases width.
      // For right panels, negative movement increases width.
      const delta = isRight ? -e.movementX : e.movementX;
      onResize(delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      // Ensure cursor stays the same even if moving fast
      document.body.style.cursor = "col-resize";
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
    };
  }, [isDragging, onResize, isRight]);

  return (
    <div
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className={`group relative w-1 hover:w-1.5 transition-all cursor-col-resize z-50 flex items-center justify-center ${className}`}
      style={{
        background: isDragging ? `${themeColor}66` : "transparent",
      }}
    >
      {/* Visual Indicator Line */}
      <div
        className={`w-[1px] h-full transition-colors ${isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-40"}`}
        style={{ backgroundColor: themeColor }}
      />

      {/* Handle Dot */}
      <div
        className={`absolute w-3 h-12 rounded-full border border-white/10 transition-all ${
          isDragging
            ? "scale-110 opacity-100"
            : "scale-50 opacity-0 group-hover:opacity-100"
        }`}
        style={{
          backgroundColor: `${themeColor}33`,
          boxShadow: isDragging ? `0 0 10px ${themeColor}66` : "none",
        }}
      />
    </div>
  );
};

export default PanelResizer;
