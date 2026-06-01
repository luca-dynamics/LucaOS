import { describe, expect, it } from "vitest";
import {
  mobileNavigationLabel,
  MOBILE_NAVIGATION_LABELS,
} from "./mobileNavigationModel";

describe("mobileNavigationModel", () => {
  it("maps technical mobile tab state values to product-friendly labels", () => {
    expect(MOBILE_NAVIGATION_LABELS).toEqual({
      SYSTEM: "Apps",
      TERMINAL: "Luca",
      DATA: "Activity",
    });

    expect(mobileNavigationLabel("SYSTEM")).toBe("Apps");
    expect(mobileNavigationLabel("TERMINAL")).toBe("Luca");
    expect(mobileNavigationLabel("DATA")).toBe("Activity");
  });
});
