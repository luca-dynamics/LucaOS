import React from "react";

export type LucaIconComponent = React.ComponentType<{
  className?: string;
  "aria-hidden"?: boolean;
  focusable?: boolean;
  "data-icon"?: "inline-start" | "inline-end";
}>;

export interface LucaIconProps {
  icon: LucaIconComponent;
  className?: string;
  position?: "inline-start" | "inline-end";
}

/** Type-safe icon boundary for new Luca component contracts. */
export function LucaIcon({ icon: IconComponent, className, position = "inline-start" }: LucaIconProps) {
  return (
    <IconComponent
      aria-hidden
      focusable={false}
      data-icon={position}
      className={className}
    />
  );
}
