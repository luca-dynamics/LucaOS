import { describe, expect, it } from "vitest";
import {
  buildAboutHardwareStats,
  formatGigabytes,
  type AboutSystemSpecs,
} from "./settingsAboutHardware";

/**
 * `modelManagerService.getSystemSpecs()` is typed `Promise<any>`, so TypeScript
 * cannot catch a stat value that is secretly an object. This is the payload the
 * `get-system-specs` handler in `platforms/electron/main.cjs` really returns —
 * note `cpu` is an object. Rendering it directly threw "Objects are not valid
 * as a React child" and took down the whole app shell through SafeComponent.
 */
const realSpecs: AboutSystemSpecs = {
  memory: { total: 17_054_818_304, free: 4_294_967_296, totalGB: 16 },
  cpu: {
    model: "AMD Ryzen 7 5800H with Radeon Graphics",
    cores: 16,
    arch: "x64",
  },
  gpu: "Unknown",
  platform: "win32",
  isAppleSilicon: false,
  isIntelMac: false,
};

const build = { version: "1.0.0", runtime: "v40.7.0" };

describe("About hardware stats", () => {
  it("renders only primitives, whatever the untyped specs payload holds", () => {
    for (const specs of [
      realSpecs,
      {} as AboutSystemSpecs,
      { error: "spawn failed" } as AboutSystemSpecs,
      { cpu: {}, memory: {} } as AboutSystemSpecs,
    ]) {
      for (const item of buildAboutHardwareStats(specs, build)) {
        expect(typeof item.value, `${item.label} value`).toBe("string");
        if (item.detail !== undefined) {
          expect(typeof item.detail, `${item.label} detail`).toBe("string");
        }
      }
    }
  });

  it("reads the CPU model out of the object and moves cores/arch to the tooltip", () => {
    const cpu = buildAboutHardwareStats(realSpecs, build).find(
      (item) => item.label === "CPU",
    );

    expect(cpu?.value).toBe("AMD Ryzen 7 5800H with Radeon Graphics");
    expect(cpu?.detail).toBe("16 cores · x64");
  });

  it("prefers the handler's own totalGB so memory matches the rest of the app", () => {
    const memory = buildAboutHardwareStats(realSpecs, build).find(
      (item) => item.label === "Installed memory",
    );

    expect(memory?.value).toBe("16 GB");
  });

  it("uses binary GB when only a raw byte count is available", () => {
    // Decimal division reported 17.1 GB for a 16 GiB machine.
    expect(formatGigabytes(17_054_818_304)).toBe("15.9 GB");
    expect(formatGigabytes(0)).toBe("Unknown");
    expect(formatGigabytes(undefined)).toBe("Unknown");
  });

  it("says the GPU was not detected instead of claiming it is Unknown hardware", () => {
    const onWindows = buildAboutHardwareStats(realSpecs, build).find(
      (item) => item.label === "GPU",
    );

    expect(onWindows?.value).toBe("Not detected");
    expect(onWindows?.detail).toContain("only probes the GPU on macOS");

    const onMac = buildAboutHardwareStats(
      { ...realSpecs, gpu: "Apple M3 Pro" },
      build,
    ).find((item) => item.label === "GPU");

    expect(onMac?.value).toBe("Apple M3 Pro");
    expect(onMac?.detail).toContain("accelerated");
  });
});
