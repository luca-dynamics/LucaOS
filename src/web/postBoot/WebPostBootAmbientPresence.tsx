interface WebPostBootAmbientPresenceProps {
  className?: string;
}

/**
 * WebPostBootAmbientPresence — a calm, presentation-only ambient layer that
 * places the Luca identity (the boot hologram) as a heavily blurred,
 * low-opacity light behind the readiness bridge, so the bridge shares the Boot
 * Window's identity language (per docs/luca-premium-onboarding-postboot-design.md
 * §3, "a calmer sibling of the Boot Window, sharing its identity language").
 *
 * Deliberately minimal and inert:
 * - Purely decorative: aria-hidden, pointer-events:none, no motion, reads no
 *   state, and triggers no routing / timing / copy / Web Safe Mode behavior.
 * - Token-free: it does NOT apply a skin, add a skin boundary or resolver, or
 *   read skin-presence CSS variables — it matches the bridge's existing
 *   non-skinned material treatment, honoring the post-boot bridge no-touch
 *   boundaries.
 * - It must sit BEHIND the bridge content; the consuming surface keeps its card
 *   on a higher stacking level. It does not replace the existing sharp face
 *   mark or the status orbs.
 */
export function WebPostBootAmbientPresence({
  className = "",
}: WebPostBootAmbientPresenceProps) {
  return (
    <div
      aria-hidden="true"
      data-web-postboot-ambient-presence=""
      className={`pointer-events-none absolute inset-0 z-0 overflow-hidden ${className}`.trim()}
    >
      <img
        src="/hologram.png"
        alt=""
        aria-hidden="true"
        draggable={false}
        className="absolute -right-24 -top-24 h-auto w-[min(70vw,34rem)] max-w-none select-none"
        style={{ opacity: 0.16, filter: "blur(44px)" }}
      />
    </div>
  );
}
