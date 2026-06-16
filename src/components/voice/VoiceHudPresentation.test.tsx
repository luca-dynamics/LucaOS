import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "fs";
import { describe, expect, it, vi } from "vitest";
import VoiceHudPresentation, { type VoiceHudPresentationState } from "./VoiceHudPresentation";

const source = readFileSync("src/components/voice/VoiceHudPresentation.tsx", "utf8");
const forbiddenImports = ["electron", "window.electron", "window.luca", "eventBus", "lucaService", "toolRegistry", "voiceSessionOrchestrator", "liveService", "soundService", "settingsService", "personalityService", "awarenessService", "lucaLinkManager", "node:fs", "better-sqlite3"];

describe("VoiceHudPresentation", () => {
  it.each<VoiceHudPresentationState>(["idle", "requesting", "listening", "thinking", "speaking", "unavailable"])("renders VoiceHUD-style presentation for %s", (state) => {
    render(<VoiceHudPresentation state={state} />);
    expect(screen.getByLabelText("Luca VoiceHUD presentation")).toBeTruthy();
    expect(screen.getByText("LUCA VOICE")).toBeTruthy();
  });

  it("renders transcript and assistantText when provided", () => {
    render(<VoiceHudPresentation state="speaking" transcript="hello" assistantText="answer" />);
    expect(screen.getByText("answer")).toBeTruthy();
  });

  it("renders Back / Change mode when onBack is provided", () => {
    render(<VoiceHudPresentation state="idle" onBack={() => {}} />);
    expect(screen.getByText("Back / Change mode")).toBeTruthy();
  });

  it("renders typed fallback only when showTypedFallback is true", () => {
    const { rerender } = render(<VoiceHudPresentation state="idle" />);
    expect(screen.queryByLabelText("Typed fallback")).toBeNull();
    rerender(<VoiceHudPresentation state="idle" showTypedFallback />);
    expect(screen.getByLabelText("Typed fallback")).toBeTruthy();
  });

  it("calls presentation callbacks", () => {
    const onRequestMic = vi.fn();
    const onBack = vi.fn();
    const onContinue = vi.fn();
    const onTypedFallbackChange = vi.fn();
    render(<VoiceHudPresentation state="idle" showTypedFallback onRequestMic={onRequestMic} onBack={onBack} onContinue={onContinue} onTypedFallbackChange={onTypedFallbackChange} />);
    fireEvent.click(screen.getByText("Enable microphone"));
    fireEvent.click(screen.getByText("Back / Change mode"));
    fireEvent.click(screen.getByText("Continue with Luca Voice"));
    fireEvent.change(screen.getByLabelText("Typed fallback"), { target: { value: "typed" } });
    expect(onRequestMic).toHaveBeenCalled();
    expect(onBack).toHaveBeenCalled();
    expect(onContinue).toHaveBeenCalled();
    expect(onTypedFallbackChange).toHaveBeenCalledWith("typed");
  });

  it("does not contain forbidden runtime imports", () => {
    for (const forbidden of forbiddenImports) expect(source).not.toContain(forbidden);
  });
});
