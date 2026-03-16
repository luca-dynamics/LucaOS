import { FaceLandmarker, FilesetResolver, FaceLandmarkerResult } from "@mediapipe/tasks-vision";

export interface BiometricDescriptor {
  type: "face" | "voice";
  vector: number[];
  timestamp: number;
  modelVersion: string;
}

export class BiometricService {
  private faceLandmarker: FaceLandmarker | null = null;
  private isInitializing = false;

  constructor() {
    console.log("[BIOMETRIC_SERVICE] Initialized. Ready to secure identity.");
  }

  /**
   * Initialize MediaPipe Face Landmarker
   */
  private async initFaceLandmarker() {
    if (this.faceLandmarker) return;
    if (this.isInitializing) {
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.isInitializing = true;
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      
      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "IMAGE",
        numFaces: 1
      });
      console.log("[BIOMETRIC_SERVICE] FaceLandmarker loaded successfully.");
    } catch (error) {
      console.error("[BIOMETRIC_SERVICE] Failed to load FaceLandmarker:", error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Extract facial embedding (as a normalized landmark vector)
   */
  public async extractFaceEmbedding(imageSource: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): Promise<number[] | null> {
    await this.initFaceLandmarker();
    if (!this.faceLandmarker) return null;

    const result: FaceLandmarkerResult = this.faceLandmarker.detect(imageSource);
    
    if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
      return null;
    }

    const landmarks = result.faceLandmarks[0];
    const vector: number[] = [];
    const anchor = landmarks[0];
    
    for (const lm of landmarks) {
      vector.push(lm.x - anchor.x);
      vector.push(lm.y - anchor.y);
      vector.push(lm.z - anchor.z);
    }

    return this.normalizeVector(vector);
  }

  /**
   * Get 3D Pose (Pitch, Yaw, Roll) to guide the user during scanning
   */
  public getFacePose(landmarks: any[]) {
    // Simplified pose estimation based on landmark positions
    // Nose: 1, Left Eye: 33, Right Eye: 263
    const nose = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];

    const yaw = (nose.x - (leftEye.x + rightEye.x) / 2) * 100; // Left/Right
    const pitch = (nose.y - (leftEye.y + rightEye.y) / 2) * 100; // Up/Down
    
    return { yaw, pitch };
  }

  /**
   * Helper to normalize vector (L2 Norm)
   */
  private normalizeVector(v: number[]): number[] {
    const magnitude = Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return v;
    return v.map(val => val / magnitude);
  }

  /**
   * Calculate similarity between two vectors
   */
  public calculateSimilarity(v1: number[], v2: number[]): number {
    if (!v1 || !v2 || v1.length !== v2.length) return 0;
    let dotProduct = 0;
    for (let i = 0; i < v1.length; i++) {
      dotProduct += v1[i] * v2[i];
    }
    return dotProduct;
  }

  /**
   * Verify identity against a stored reference vector
   */
  public verify(liveVector: number[], referenceVector: number[], threshold = 0.85): boolean {
    const similarity = this.calculateSimilarity(liveVector, referenceVector);
    console.log(`[BIOMETRIC_SERVICE] Verification similarity score: ${similarity.toFixed(4)} (Threshold: ${threshold})`);
    return similarity >= threshold;
  }
}

export const biometricService = new BiometricService();
export default biometricService;
