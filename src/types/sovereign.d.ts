/**
 * GLOBAL SOVEREIGN AGI KERNEL TYPES
 * These constants are injected at build-time by Vite.
 */

declare const __LUCA_DEV_MODE__: boolean;

interface Window {
  __LUCA_DEV_MODE__?: boolean;
}
