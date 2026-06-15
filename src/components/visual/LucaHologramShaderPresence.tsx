import React, { lazy, Suspense, useEffect, useState } from "react";

const LucaHologramShaderScene = lazy(
  () => import("./LucaHologramShaderScene"),
);

export type LucaHologramShaderPresenceState =
  | "idle"
  | "preparing"
  | "ready"
  | "attention";

interface LucaHologramShaderPresenceProps {
  state?: LucaHologramShaderPresenceState;
  size?: number;
  themeColor?: string;
  reducedMotion?: boolean;
  className?: string;
}

function HologramFallback({
  themeColor,
}: {
  themeColor: string;
}) {
  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full"
      style={{ color: themeColor }}
      data-hologram-fallback="true"
    >
      <div className="absolute inset-[12%] rounded-full border border-current/20" />
      <div className="absolute inset-[24%] rounded-full bg-current/15 blur-2xl motion-safe:animate-pulse" />
      <div
        className="h-[44%] w-[34%] rounded-[48%_48%_42%_42%] border border-current/35 bg-current/10 shadow-[0_0_40px_currentColor]"
        aria-hidden="true"
      />
    </div>
  );
}

export function LucaHologramShaderPresence({
  state = "idle",
  size = 220,
  themeColor = "#67e8f9",
  reducedMotion = false,
  className = "",
}: LucaHologramShaderPresenceProps) {
  const [canRenderShader, setCanRenderShader] = useState(false);
  const [shaderFailed, setShaderFailed] = useState(false);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const hasWebGl = Boolean(
        canvas.getContext("webgl2") || canvas.getContext("webgl"),
      );
      const deviceMemory = (navigator as Navigator & { deviceMemory?: number })
        .deviceMemory;
      const lowMemory =
        typeof deviceMemory === "number" && deviceMemory <= 2;
      setCanRenderShader(hasWebGl && !lowMemory);
    } catch {
      setCanRenderShader(false);
    }
  }, []);

  const fallback = <HologramFallback themeColor={themeColor} />;

  return (
    <div
      className={`relative shrink-0 overflow-hidden ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Luca hologram ${state}`}
      data-hologram-source="/models/avatar.glb"
    >
      <div
        className="absolute inset-[8%] rounded-full opacity-30 blur-3xl"
        style={{ backgroundColor: themeColor }}
      />
      {canRenderShader && !shaderFailed ? (
        <Suspense fallback={fallback}>
          <ErrorBoundary onError={() => setShaderFailed(true)}>
            <LucaHologramShaderScene
              color={themeColor}
              active={state === "preparing" || state === "attention"}
              reducedMotion={reducedMotion}
            />
          </ErrorBoundary>
        </Suspense>
      ) : (
        fallback
      )}
    </div>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
