import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Icon } from "./ui/Icon";
import { settingsService } from "../services/settingsService";

interface ScreenShareProps {
  onFrameCapture: (base64Image: string) => void;
  isActive: boolean;
  onToggle: (active: boolean) => void;
  theme: { hex: string; bg: string; border: string; primary: string };
  showUI?: boolean;
}

export interface ScreenShareHandle {
  captureFrame: () => string | null | undefined;
}

export const ScreenShare = forwardRef<ScreenShareHandle, ScreenShareProps>(
  (
    {
      onFrameCapture,
      isActive,
      onToggle,
      theme,
      showUI = true,
    },
    ref,
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null); // Ref to track stream for cleanup
    const [error, setError] = useState<string | null>(null);
    const [availableSources, setAvailableSources] = useState<any[]>([]);
    const [showSourcePicker, setShowSourcePicker] = useState(false);

    // Expose capture functionality to parent
    useImperativeHandle(ref, () => ({
      captureFrame: () => {
        if (isActive && videoRef.current && canvasRef.current) {
          try {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");

            if (video.readyState === video.HAVE_ENOUGH_DATA && context) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              context.drawImage(video, 0, 0, canvas.width, canvas.height);

              // Low quality JPEG for massive bandwidth saving (good enough for vision)
              const base64Image = canvas.toDataURL("image/jpeg", 0.4);
              onFrameCapture(base64Image); // Still call callback if needed
              return base64Image; // Return directly
            }
          } catch (err) {
            console.error("Manual frame capture failed:", err);
          }
        }
        return null;
      },
    }));

    // Start/Stop Screen Share
    useEffect(() => {
      const checkPrivacy = () => {
        const settings = settingsService.getSettings();
        if (settings.privacy && settings.privacy.screenEnabled === false) {
          console.warn("[ScreenShare] 🔒 SCREEN LOCKED: Blocked by Privacy");
          setError("Screen access is disabled in Privacy Settings.");
          stopCapture();
          return false;
        }
        return true;
      };

      const startCapture = async () => {
        if (!checkPrivacy()) {
          onToggle(false);
          return;
        }
        try {
          // If already active, don't restart (unless stream is missing)
          if (streamRef.current) return;

          console.log("Starting Screen Share...");
          let mediaStream: MediaStream;

          // ELECTRON: Use desktopCapturer via main process
          if (window.luca && window.luca.triggerScreenPermission) {
            // ... (Electron logic typically handles sources differently,
            // but for now we assume the bridge returns a sourceId or controls selection)
            // Simplified: Just ask for sources first
            const sources =
              (await window.luca.triggerScreenPermission()) as unknown as any[];
            console.log("Got sources:", sources);

            if (sources && sources.length === 1) {
              // Auto-select if only 1
              const source = sources[0];
              mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                  mandatory: {
                    chromeMediaSource: "desktop",
                    chromeMediaSourceId: source.id,
                    maxWidth: 1920,
                    maxHeight: 1080,
                  },
                } as any,
              });
            } else {
              // Show picker
              setAvailableSources(sources);
              setShowSourcePicker(true);
              return;
            }
          } else {
            // WEB FALLBACK
            mediaStream = await navigator.mediaDevices.getDisplayMedia({
              video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { ideal: 5 }, // Low FPS is fine for screenshots
              },
              audio: false,
            });
          }

          streamRef.current = mediaStream; // Update Ref
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
          setError(null);

          // Track stop event (user clicks "Stop sharing" in browser UI)
          mediaStream.getVideoTracks()[0].onended = () => {
            onToggle(false);
          };
        } catch (err) {
          console.error("Error starting screen share:", err);
          setError("Failed to access screen. Permission denied?");
          onToggle(false);
        }
      };

      const stopCapture = () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }
        }
      };

      if (isActive) {
        startCapture();
      } else {
        stopCapture();
        setShowSourcePicker(false);
      }

      // Listen for privacy changes
      const handlePrivacyChange = (settings: any) => {
        if (settings.privacy && settings.privacy.screenEnabled === false) {
          stopCapture();
          onToggle(false);
        }
      };
      settingsService.on("settings-changed", handlePrivacyChange);

      return () => {
        stopCapture();
        settingsService.off("settings-changed", handlePrivacyChange);
      };
    }, [isActive, onToggle]);

    // Construct stream from selected source (Electron only)
    const selectSource = async (sourceId: string) => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: "desktop",
              chromeMediaSourceId: sourceId,
              maxWidth: 1920,
              maxHeight: 1080,
            },
          } as any,
        });

        streamRef.current = mediaStream; // Update Ref
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setShowSourcePicker(false);
        setError(null);

        mediaStream.getVideoTracks()[0].onended = () => {
          onToggle(false);
        };
      } catch (err) {
        console.error("Failed to select source:", err);
        setError("Could not capture selected screen.");
      }
    };

    return (
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
        {/* Hidden Elements for Processing */}
        <video ref={videoRef} className="hidden" autoPlay playsInline muted />
        <canvas ref={canvasRef} className="hidden" />

        {/* SOURCE PICKER OVERLAY */}
        {showUI && showSourcePicker && (
          <div className="fixed inset-0 z-[100] bg-black/80 glass-blur flex items-center justify-center p-8 animate-in fade-in pointer-events-auto">
            <div
              className={`glass-panel tech-border ${theme.primary} rounded-lg p-6 max-w-4xl w-full flex flex-col max-h-[80vh] overflow-hidden`}
              style={{
                background: "rgba(11, 6, 6, 0.45)",
                borderColor: `${theme.hex}33`,
                boxShadow: `0 0 50px ${theme.hex}1a`,
              }}
            >
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Icon name="Eye" style={{ color: theme.hex }} /> SELECT SCREEN
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-y-auto p-1 flex-1">
                {availableSources.map((source) => (
                  <button
                    key={source.id}
                    onClick={() => selectSource(source.id)}
                    className="group relative aspect-video bg-white/5 rounded-lg border border-white/10 transition-all overflow-hidden flex flex-col"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = theme.hex;
                      e.currentTarget.style.backgroundColor =
                        "rgba(255, 255, 255, 0.08)";
                      e.currentTarget.style.boxShadow = `0 0 15px ${theme.hex}4d`; // 30% opacity
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "";
                      e.currentTarget.style.backgroundColor = "";
                      e.currentTarget.style.boxShadow = "";
                    }}
                  >
                    <div className="flex-1 w-full relative overflow-hidden p-2">
                      <img
                        src={source.thumbnail}
                        alt={source.name}
                        className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                    <div className="h-8 bg-black/40 border-t border-white/5 flex items-center justify-center px-2 w-full">
                      <span className="text-[10px] text-slate-300 truncate font-mono w-full text-center">
                        {source.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setShowSourcePicker(false)}
                  className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded border border-white/10 transition-all"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = theme.hex;
                    e.currentTarget.style.color = theme.hex;
                    e.currentTarget.style.boxShadow = `0 0 15px ${theme.hex}33`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "";
                    e.currentTarget.style.color = "";
                    e.currentTarget.style.boxShadow = "";
                  }}
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}

        {showUI && error && (
          <div className="bg-red-900/80 text-red-200 text-xs p-2 rounded border border-red-500/50 pointer-events-auto">
            {error}
          </div>
        )}
      </div>
    );
  },
);

ScreenShare.displayName = "ScreenShare";

export default ScreenShare;
