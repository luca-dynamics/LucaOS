import { useState, useMemo } from "react";
import { settingsService } from "../services/settingsService";

export function useVoiceSystem() {
  const [isVoiceMode, setIsVoiceMode] = useState(() => {
    const settings = settingsService.getSettings();
    return settings.general?.preferredMode === "voice";
  });
  const [showVoiceHud, setShowVoiceHud] = useState(() => {
    const settings = settingsService.getSettings();
    return settings.general?.preferredMode === "voice";
  });
  const [voiceAmplitude, setVoiceAmplitude] = useState(0);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceTranscriptSource, setVoiceTranscriptSource] = useState<
    "user" | "model"
  >("user");
  const [voiceModel, setVoiceModel] = useState<string>(
    settingsService.get("voice")?.sttModel || "gemini-3-flash-preview",
  );
  const [isVadActive, setIsVadActive] = useState(false);
  const [voiceSearchResults, setVoiceSearchResults] = useState<any | null>(
    null,
  );
  const [visualData, setVisualData] = useState<any | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ingestionState, setIngestionState] = useState<{
    active: boolean;
    files: string[];
    skills: string[];
  }>({ active: false, files: [], skills: [] });

  const [approvalRequest, setApprovalRequest] = useState<any | null>(null);

  return useMemo(() => ({
    isVoiceMode,
    setIsVoiceMode,
    showVoiceHud,
    setShowVoiceHud,
    voiceAmplitude,
    setVoiceAmplitude,
    voiceTranscript,
    setVoiceTranscript,
    voiceTranscriptSource,
    setVoiceTranscriptSource,
    voiceModel,
    setVoiceModel,
    isVadActive,
    setIsVadActive,
    voiceSearchResults,
    setVoiceSearchResults,
    visualData,
    setVisualData,
    isSpeaking,
    setIsSpeaking,
    ingestionState,
    setIngestionState,
    approvalRequest,
    setApprovalRequest,
  }), [isVoiceMode, showVoiceHud, voiceAmplitude, voiceTranscript, voiceTranscriptSource, voiceModel, isVadActive, voiceSearchResults, visualData, isSpeaking, ingestionState, approvalRequest]);
}
