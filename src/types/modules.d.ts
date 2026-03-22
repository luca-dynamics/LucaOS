declare module "@shiguredo/rnnoise-wasm" {
  export interface DenoiseState {
    processFrame(frame: Float32Array): number;
    destroy(): void;
  }

  export interface Rnnoise {
    createDenoiseState(): DenoiseState;
    destroy(): void;
  }

  export const Rnnoise: {
    load(): Promise<Rnnoise>;
  };
}

declare module "@ricky0123/vad-web" {
  export interface MicVADOptions {
    onSpeechStart?: () => void;
    onSpeechEnd?: (audio: Float32Array) => void;
    onFrameProcessed?: (probabilities: any, frame: Float32Array) => void;
    positiveSpeechThreshold?: number;
    negativeSpeechThreshold?: number;
    minSpeechMs?: number;
    model?: string;
    getStream?: () => Promise<MediaStream>;
    baseAssetPath?: string;
    onnxWASMBasePath?: string;
    audioContext?: AudioContext;
  }

  export class MicVAD {
    static new(options: Partial<MicVADOptions>): Promise<MicVAD>;
    start(): void;
    pause(): void;
    destroy(): void;
    listening: boolean;
  }
}

declare module "@react-three/fiber" {
  export const Canvas: any;
  export const useFrame: any;
  export const useThree: any;
  export const extend: any;
}

declare module "@react-three/drei" {
  export const useGLTF: any;
  export const Center: any;
  export const Text: any;
  export const Environment: any;
  export const Float: any;
  export const MeshDistortMaterial: any;
  export const MeshWobbleMaterial: any;
  export const Points: any;
  export const PointMaterial: any;
  export const OrbitControls: any;
  export const PerspectiveCamera: any;
  export const Sphere: any;
  export const shaderMaterial: any;
}

declare module "lucide-react" {
  const icons: { [key: string]: any };
  export = icons;
  export as namespace LucideReact;
}
