export type SurfaceKind = "voice_hud" | "desktop_widget" | "lock_screen" | "watch" | "driving" | "xr";

export interface PresenceProfile {
  surface: SurfaceKind;
  expressionScale: number;
}

export const PRESENCE_PROFILES: Record<SurfaceKind, PresenceProfile> = {
  voice_hud: { surface: "voice_hud", expressionScale: 1.0 },
  desktop_widget: { surface: "desktop_widget", expressionScale: 0.45 },
  lock_screen: { surface: "lock_screen", expressionScale: 0.35 },
  watch: { surface: "watch", expressionScale: 0.20 },
  driving: { surface: "driving", expressionScale: 0.15 },
  xr: { surface: "xr", expressionScale: 1.40 },
};
