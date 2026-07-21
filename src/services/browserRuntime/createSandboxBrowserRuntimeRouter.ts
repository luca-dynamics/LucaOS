/**
 * Factory: BrowserRuntimeRouter pre-registered with the sandbox Playwright adapter.
 * Defaults keep real execution off until `enabled: true` and a driver are supplied.
 */

import { BrowserRuntimeRouter } from "./BrowserRuntimeRouter";
import { SandboxPlaywrightBrowserRuntimeAdapter } from "./adapters/SandboxPlaywrightBrowserRuntimeAdapter";
import type {
  BrowserDriver,
  BrowserRuntimeLaneProvider,
  SandboxPlaywrightBrowserRuntimeAdapterOptions,
} from "./types";

export interface CreateSandboxBrowserRuntimeRouterOptions {
  /** Forwarded to SandboxPlaywrightBrowserRuntimeAdapter (default disabled). */
  adapter?: SandboxPlaywrightBrowserRuntimeAdapterOptions;
  /** Convenience: set adapter.driver */
  driver?: BrowserDriver;
  /** Convenience: set adapter.enabled */
  enabled?: boolean;
  laneProviders?: BrowserRuntimeLaneProvider[];
  /** Extra adapters (e.g. mocks in tests). Sandbox adapter is always registered first. */
  additionalAdapters?: ConstructorParameters<typeof BrowserRuntimeRouter>[0];
}

export interface SandboxBrowserRuntimeRouterBundle {
  router: BrowserRuntimeRouter;
  sandboxAdapter: SandboxPlaywrightBrowserRuntimeAdapter;
}

export function createSandboxBrowserRuntimeRouter(
  options: CreateSandboxBrowserRuntimeRouterOptions = {},
): SandboxBrowserRuntimeRouterBundle {
  const sandboxAdapter = new SandboxPlaywrightBrowserRuntimeAdapter({
    ...options.adapter,
    ...(options.driver !== undefined ? { driver: options.driver } : {}),
    ...(options.enabled !== undefined ? { enabled: options.enabled } : {}),
  });

  const adapters = [sandboxAdapter, ...(options.additionalAdapters ?? [])];
  const router = new BrowserRuntimeRouter(adapters, options.laneProviders ?? []);

  return { router, sandboxAdapter };
}
