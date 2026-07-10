import { LucaHologramPresence } from "../../components/visual/LucaHologramPresence";

export function WebRealHologramSurface() {
  return (
    <div
      aria-hidden="true"
      data-luca-web-real-hologram-surface
      className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden"
    >
      <div
        className="absolute h-[min(56vw,32rem)] w-[min(56vw,32rem)] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--luca-accent-primary) 16%, transparent) 0%, transparent 68%)",
        }}
      />
      <LucaHologramPresence
        size={300}
        state="ready"
        themeColor="var(--luca-accent-primary)"
        className="opacity-[0.08] saturate-125"
      />
    </div>
  );
}

export default WebRealHologramSurface;
