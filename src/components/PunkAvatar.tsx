import React from "react";

interface PunkAvatarProps {
  seed: string;
  size?: number;
  className?: string;
}

export function PunkAvatar({
  seed,
  size = 40,
  className = "",
}: PunkAvatarProps) {
  // Simple deterministic color generator
  const getGradient = (seed: string) => {
    const hash = seed
      .split("")
      .reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const colors = [
      "from-[color-mix(in_srgb,var(--luca-accent-primary,#9b7cff)_12%,transparent)] to-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]",
      "from-[color-mix(in_srgb,var(--luca-accent-primary,#9b7cff)_12%,transparent)] to-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)]",
      "from-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)] to-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)]",
      "from-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)] to-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)]",
      "from-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)] to-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)]",
    ];
    return colors[hash % colors.length];
  };

  const gradient = getGradient(seed);

  return (
    <div
      className={`rounded overflow-hidden bg-gradient-to-br ${gradient} flex items-center justify-center shadow-inner ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        className="text-white font-bold opacity-80 select-none pb-0.5"
        style={{ fontSize: size * 0.5 }}
      >
        {seed.substring(0, 2).toUpperCase()}
      </span>
    </div>
  );
}

export function getTraderAvatar(traderId: string, traderName?: string): string {
  return traderName || traderId || "UNK";
}
