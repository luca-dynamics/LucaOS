import type { SettingsStatItem } from "./SettingsLayout";

/**
 * The shape `get-system-specs` actually returns from the Electron main process
 * (`platforms/electron/main.cjs`). `modelManagerService.getSystemSpecs()` is
 * typed `Promise<any>`, so nothing upstream checks this for us — `cpu` is an
 * object, not a string, and rendering it directly throws
 * "Objects are not valid as a React child".
 */
export interface AboutSystemSpecs {
  cpu?: { model?: string; cores?: number; arch?: string };
  gpu?: string;
  memory?: { total?: number; free?: number; totalGB?: number };
  platform?: string;
  isAppleSilicon?: boolean;
  isIntelMac?: boolean;
  /** Present instead of the fields above when the handler threw. */
  error?: string;
}

/** Binary GB, to match the handler's own `memory.totalGB` and what the OS reports. */
export const formatGigabytes = (bytes?: number): string =>
  bytes && bytes > 0 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : "Unknown";

const describeCpu = (cpu: AboutSystemSpecs["cpu"]): string | undefined => {
  if (!cpu) return undefined;
  const parts = [
    cpu.cores ? `${cpu.cores} cores` : null,
    cpu.arch || null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : undefined;
};

/**
 * Hardware rows for About's Advanced Details. Every `value` here must be a
 * string — the specs arrive untyped, so this is where the shape is pinned.
 */
export function buildAboutHardwareStats(
  specs: AboutSystemSpecs,
  build: { version: string; runtime: string },
): SettingsStatItem[] {
  const totalGB =
    specs.memory?.totalGB && specs.memory.totalGB > 0
      ? `${specs.memory.totalGB} GB`
      : formatGigabytes(specs.memory?.total);

  // "Unknown" is the handler's own sentinel for "did not probe", not a value.
  const gpu = specs.gpu?.trim();
  const gpuDetected = Boolean(gpu) && gpu !== "Unknown";

  return [
    {
      label: "CPU",
      value: specs.cpu?.model?.trim() || "Unknown",
      detail: describeCpu(specs.cpu) ?? "Reported by the desktop shell at startup.",
    },
    {
      label: "GPU",
      value: gpuDetected ? (gpu as string) : "Not detected",
      detail: gpuDetected
        ? "Determines which local models can run accelerated."
        : "The shell only probes the GPU on macOS today.",
    },
    {
      label: "Installed memory",
      value: totalGB,
      detail: "Used to size local model recommendations.",
    },
    {
      label: "Build metadata",
      value: `v${build.version}`,
      detail: `Package v${build.version} • Runtime ${build.runtime}`,
    },
  ];
}
