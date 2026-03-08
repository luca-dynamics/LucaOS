import {
  FaceDetector,
  FilesetResolver,
  FaceLandmarker,
} from "@mediapipe/tasks-vision";
import { EventEmitter } from "events";

export type PresenceState = "ACTIVE" | "WATCHING" | "SENTRY" | "SYSTEM_SLEEP";
export type UserPresence = "PRESENT" | "ABSENT";

export interface PresenceResult {
  presence: UserPresence;
  faceCount: number;
  mood?: string;
}

class PresenceService extends EventEmitter {
  private detector: FaceDetector | null = null;
  private landmarker: FaceLandmarker | null = null;
  private isInitialized = false;

  constructor() {
    super();
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm",
      );

      this.detector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/face_detector.task",
          delegate: "CPU",
        },
        runningMode: "IMAGE",
      });

      // Optional: Landmarker for mood/expression
      this.landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "CPU",
        },
        runningMode: "IMAGE",
        outputFaceBlendshapes: true,
      });

      this.isInitialized = true;
      console.log("[PRESENCE] 👁️ Presence Engine Initialized");
    } catch (error) {
      console.error("[PRESENCE] Initialization failed:", error);
    }
  }

  detectPresence(
    imageSource: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
  ): PresenceResult {
    if (!this.detector) {
      return { presence: "ABSENT", faceCount: 0 };
    }

    const result = this.detector.detect(imageSource);
    const faceCount = result.detections.length;
    const presence: UserPresence = faceCount > 0 ? "PRESENT" : "ABSENT";

    let mood = "neutral";
    if (presence === "PRESENT" && this.landmarker) {
      const landmarkerResult = this.landmarker.detect(imageSource);
      if (
        landmarkerResult.faceBlendshapes &&
        landmarkerResult.faceBlendshapes.length > 0
      ) {
        mood = this.analyzeMood(landmarkerResult.faceBlendshapes[0].categories);
      }
    }

    return { presence, faceCount, mood };
  }

  private analyzeMood(blendshapes: any[]): string {
    // Simple blendshape to mood mapping
    const shapes: Record<string, number> = {};
    blendshapes.forEach((b) => {
      shapes[b.categoryName] = b.score;
    });

    if (
      shapes["smile"] > 0.5 ||
      (shapes["mouthSmileLeft"] > 0.5 && shapes["mouthSmileRight"] > 0.5)
    )
      return "happy";
    if (shapes["browDownLeft"] > 0.5 || shapes["browDownRight"] > 0.5)
      return "focused";
    if (shapes["eyeBlinkLeft"] > 0.8 && shapes["eyeBlinkRight"] > 0.8)
      return "tired";

    return "neutral";
  }
}

export const presenceService = new PresenceService();
