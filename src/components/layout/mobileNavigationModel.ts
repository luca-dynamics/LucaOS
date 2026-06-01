export type MobileNavigationTab = "SYSTEM" | "TERMINAL" | "DATA";

export const MOBILE_NAVIGATION_LABELS: Record<MobileNavigationTab, string> = {
  SYSTEM: "Apps",
  TERMINAL: "Luca",
  DATA: "Activity",
};

export function mobileNavigationLabel(tab: MobileNavigationTab): string {
  return MOBILE_NAVIGATION_LABELS[tab];
}
