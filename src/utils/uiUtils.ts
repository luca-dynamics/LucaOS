import { setHexAlpha } from "../config/themeColors";

export const getGlassStyle = (
  theme: any,
  isActive: boolean = false,
  isDanger: boolean = false,
) => {
  const isLight = theme.themeName?.toLowerCase() === "lucagent";
  const baseColor = isDanger ? "#ef4444" : theme.hex;

  if (isLight) {
    return {
      background: isDanger
        ? `rgba(239, 68, 68, calc(${isActive ? "0.2" : "0.1"} * var(--app-bg-opacity, 0.9)))`
        : `rgba(255, 255, 255, calc(${isActive ? "0.6" : "0.4"} * var(--app-bg-opacity, 0.9)))`,
      border: `1px solid ${isDanger ? "rgba(239, 68, 68, 0.3)" : "rgba(0, 0, 0, 0.08)"}`,
      boxShadow: isActive
        ? `0 8px 32px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.2)`
        : `0 4px 12px rgba(0, 0, 0, 0.03)`,
      borderColor: isDanger ? "rgba(239, 68, 68, 0.3)" : "rgba(0, 0, 0, 0.08)",
      glow: isDanger
        ? "0 0 20px rgba(239, 68, 68, 0.2)"
        : "0 0 20px rgba(255, 255, 255, 0.4)",
      backdropFilter: "blur(var(--app-bg-blur, 12px))",
      WebkitBackdropFilter: "blur(var(--app-bg-blur, 12px))",
    };
  }
  // Dark mode uses Hex. We can't strictly use rgba with CSS vars easily unless we parse it.
  // But we can approximate using color-mix in modern browsers:
  return {
    background: `color-mix(in srgb, ${isActive ? baseColor : isDanger ? "#ef4444" : "#000000"} ${isActive ? "20%" : "35%"}, transparent calc(100% - (var(--app-bg-opacity, 0.75) * 100%)))`,
    border: `1px solid ${setHexAlpha(baseColor, isActive ? 0.4 : 0.15)}`,
    boxShadow: isActive
      ? `0 0 20px ${setHexAlpha(baseColor, 0.15)}, inset 0 1px 0 rgba(255, 255, 255, 0.05)`
      : `inset 0 1px 0 rgba(255, 255, 255, 0.03), 0 1px 0 rgba(100, 116, 139, 0.1)`,
    borderColor: setHexAlpha(baseColor, isActive ? 0.4 : 0.15),
    glow: `0 0 20px ${setHexAlpha(baseColor, 0.15)}`,
    backdropFilter: "blur(var(--app-bg-blur, 12px))",
    WebkitBackdropFilter: "blur(var(--app-bg-blur, 12px))",
  };
};
