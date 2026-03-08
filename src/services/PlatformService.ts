/**
 * Platform Detection Service
 * Handles cross-platform path normalization and platform-specific behavior
 */

export type Platform = "windows" | "macos" | "linux";

export class PlatformService {
  /**
   * Detect current platform
   */
  static getPlatform(): Platform {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return "linux"; // Default for server-side
    }

    const platform = window.navigator.platform.toLowerCase();
    const userAgent = window.navigator.userAgent.toLowerCase();

    if (platform.includes("win") || userAgent.includes("windows")) {
      return "windows";
    }
    if (platform.includes("mac") || userAgent.includes("macintosh")) {
      return "macos";
    }
    return "linux";
  }

  /**
   * Get platform-specific path separator
   */
  static getPathSeparator(): string {
    return this.getPlatform() === "windows" ? "\\" : "/";
  }

  /**
   * Normalize path for current platform
   */
  static normalizePath(path: string): string {
    const separator = this.getPathSeparator();

    if (this.getPlatform() === "windows") {
      // Convert Unix-style paths to Windows
      return path.replace(/\//g, "\\");
    }

    // Convert Windows-style paths to Unix
    return path.replace(/\\/g, "/");
  }

  /**
   * Check if running in Electron
   */
  static isElectron(): boolean {
    return typeof window !== "undefined" && !!(window as any).electron;
  }

  /**
   * Get platform display name
   */
  static getPlatformName(): string {
    const platform = this.getPlatform();
    switch (platform) {
      case "windows":
        return "Windows";
      case "macos":
        return "macOS";
      case "linux":
        return "Linux";
    }
  }
}

// Export singleton instance
export const platformService = new PlatformService();
