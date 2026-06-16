interface LucaStaticFacePresenceProps {
  size?: number;
  className?: string;
}

export function LucaStaticFacePresence({
  size = 220,
  className = "",
}: LucaStaticFacePresenceProps) {
  return (
    <img
      src="/icon.png"
      alt="Luca"
      width={size}
      height={size}
      decoding="async"
      loading="eager"
      className={`block object-contain ${className}`.trim()}
      style={{ width: size, height: size }}
    />
  );
}
