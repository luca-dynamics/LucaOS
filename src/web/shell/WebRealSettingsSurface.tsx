import { useRef } from "react";
import { SettingsModal } from "../../components/SettingsModal";

const webSettingsTheme = {
  primary: "var(--luca-accent-primary)",
  border: "var(--luca-border-subtle, var(--app-border-main))",
  bg: "var(--luca-surface, var(--app-bg-main))",
  glow: "var(--luca-accent-soft)",
  coreColor: "var(--luca-accent-primary)",
  hex: "var(--luca-accent-primary)",
  themeName: "luca",
};

interface WebRealSettingsSurfaceProps {
  onClose: () => void;
}

export function WebRealSettingsSurface({ onClose }: WebRealSettingsSurfaceProps) {
  const previewTargetRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={previewTargetRef}
      data-luca-web-real-settings-surface
      className="absolute inset-0 z-[80]"
    >
      <SettingsModal
        onClose={onClose}
        theme={webSettingsTheme}
        themePreviewTargetRef={previewTargetRef}
      />
    </div>
  );
}

export default WebRealSettingsSurface;
