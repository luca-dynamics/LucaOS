import { useState, useEffect } from "react";
import { settingsService } from "../services/settingsService";
import { useMobile } from "./useMobile";

export interface ThemeColors {
  primary: string;
  primaryRgb: string;
  hex: string;
  bgMain: string;
  borderMain: string;
  textMain: string;
  textMuted: string;
}

/**
 * Hook to provide reactive theme state and variables
 * Synchronizes with browser-computed CSS variables (--app-*)
 */
export function useTheme() {
  const isMobile = useMobile();
  const [themeName, setThemeName] = useState(settingsService.get("general").theme || "DEFAULT");
  const [isLight, setIsLight] = useState(false);
  
  // Basic colors for Canvas and legacy components that can't use CSS variables
  const [colors, setColors] = useState<ThemeColors>({
    primary: "#3b82f6",
    primaryRgb: "59, 130, 246",
    hex: "#3b82f6",
    bgMain: "#0f172a",
    borderMain: "rgba(255, 255, 255, 0.1)",
    textMain: "#ffffff",
    textMuted: "rgba(255, 255, 255, 0.6)",
  });

  useEffect(() => {
    // Listen for theme changes in settings
    const handleSettingsChange = () => {
      const newTheme = settingsService.get("general").theme || "DEFAULT";
      setThemeName(newTheme);
    };

    settingsService.on("settings-changed", handleSettingsChange);

    // Function to sync with browser-computed styles
    const syncWithCSS = () => {
      const rootStyle = getComputedStyle(document.documentElement);
      
      const primary = rootStyle.getPropertyValue("--app-primary").trim();
      const primaryRgb = rootStyle.getPropertyValue("--app-primary-rgb").trim();
      const bgMain = rootStyle.getPropertyValue("--app-bg-main").trim();
      const isLightTheme = bgMain.includes("255") || bgMain.includes("white");

      setIsLight(isLightTheme);
      setColors({
        primary: primary || "#3b82f6",
        primaryRgb: primaryRgb || "59, 130, 246",
        hex: primary || "#3b82f6",
        bgMain: bgMain || (isLightTheme ? "#ffffff" : "#0f172a"),
        borderMain: rootStyle.getPropertyValue("--app-border-main").trim(),
        textMain: rootStyle.getPropertyValue("--app-text-main").trim(),
        textMuted: rootStyle.getPropertyValue("--app-text-muted").trim(),
      });
    };

    // Initial sync
    syncWithCSS();

    // Re-sync on theme name change
    // Using an observer for CSS variable changes is heavy, 
    // so we just rely on common trigger points
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "style" || mutation.attributeName === "class") {
          syncWithCSS();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => {
      settingsService.off("settings-changed", handleSettingsChange);
      observer.disconnect();
    };
  }, [themeName]);

  return {
    themeName,
    isLight,
    isMobile,
    colors,
    theme: colors, // Alias for backward compatibility in TradingSettings
  };
}
