/**
 * Chrome Profile Import Prompt
 * Shown when Luca tries to use Ghost Browser but no Chrome profile is imported.
 * Offers user to import Chrome data or continue with clean browser.
 */

import React, { useState } from "react";
import { Icon } from "./ui/Icon";
import { apiUrl } from "../config/api";
import {
  lucaMaterialCardStyle,
  lucaMaterialControlStyle,
  lucaMaterialDialogStyle,
} from "../styles/lucaMaterialSystem";

interface ChromeProfilePromptProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
  onSkip?: () => void;
  theme: { hex: string };
}

const ChromeProfilePrompt: React.FC<ChromeProfilePromptProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  onSkip,
  theme,
}) => {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chromeRunning, setChromeRunning] = useState(false);

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    try {
      // Check status first
      const statusRes = await fetch(apiUrl("/api/chrome-profile/status"));
      const status = await statusRes.json();

      if (status.chromeRunning) {
        setChromeRunning(true);
        setError("Please close Chrome before importing.");
        setImporting(false);
        return;
      }

      // Import
      const res = await fetch(apiUrl("/api/chrome-profile/import"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileName: "Default" }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        onImportComplete?.();
        onClose();
      }
    } catch (e: any) {
      setError(e.message);
    }
    setImporting(false);
  };

  const handleSkip = () => {
    onSkip?.();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 w-full max-w-md rounded-2xl border p-6 shadow-2xl" data-luca-material-role="dialog" role="dialog" aria-modal="true" aria-label="Chrome profile import" style={lucaMaterialDialogStyle}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${theme.hex}20` }}
            >
              <Icon name="Chrome" className="w-5 h-5" style={{ color: theme.hex }} />
            </div>
            <h3 className="text-lg font-bold text-[var(--luca-text-primary)]">
              Use Your Browser Sessions?
            </h3>
          </div>
          <button
            onClick={onClose}
            className="luca-material-pressable rounded border p-1 transition-colors hover:text-[var(--luca-text-primary)]"
            style={lucaMaterialControlStyle}
          >
            <Icon name="X" className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="mb-4 text-sm text-[var(--luca-text-secondary)]">
            Luca can use your Chrome browser&apos;s logged-in sessions,
            bookmarks, and saved passwords for a seamless browsing experience.
          </p>

          <div className="mb-4 rounded-lg border p-3" style={lucaMaterialCardStyle}>
            <p className="text-xs text-gray-500">
              <strong className="text-gray-300">What gets imported:</strong>
            </p>
            <ul className="text-xs text-gray-500 mt-1 space-y-0.5">
              <li>• Cookies & Login Sessions</li>
              <li>• Bookmarks & History</li>
              <li>• Saved Passwords</li>
            </ul>
          </div>

          {chromeRunning && (
            <div className="flex items-center gap-2 text-[var(--luca-warning,#f2b23e)] text-xs mb-3 bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)] p-2 rounded">
              <Icon name="AlertCircle" className="w-4 h-4" />
              <span>Chrome is running. Please close it first.</span>
            </div>
          )}

          {error && <p className="text-[var(--luca-danger,#f87171)] text-xs mb-3">{error}</p>}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            className="luca-material-pressable flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:text-[var(--luca-text-primary)]"
            style={lucaMaterialControlStyle}
          >
            Use Clean Browser
          </button>
          <button
            onClick={handleImport}
            disabled={importing}
            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            style={{
              backgroundColor: theme.hex,
              color: "#000",
            }}
          >
            {importing ? (
              <Icon name="RefreshCw" className="w-4 h-4 animate-spin" />
            ) : (
              <Icon name="Chrome" className="w-4 h-4" />
            )}
            Import Chrome
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChromeProfilePrompt;

// Global event for triggering the prompt from anywhere
export const chromeProfilePromptEvents = {
  listeners: new Set<() => void>(),
  trigger() {
    this.listeners.forEach((fn) => fn());
  },
  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },
};
