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

declare namespace THREE {
  class Object3D {
    position: Vector3;
    rotation: Vector3;
    scale: Vector3 & { setScalar(value: number): void; set(x: number, y: number, z: number): void };
    traverse(callback: (child: Object3D) => void): void;
  }

  class Group extends Object3D {}

  class Vector3 {
    constructor(x?: number, y?: number, z?: number);
    x: number;
    y: number;
    z: number;
    add(vector: Vector3): this;
    sub(vector: Vector3): this;
    copy(vector: Vector3): this;
    clone(): Vector3;
    lerp(vector: Vector3, alpha: number): this;
    distanceTo(vector: Vector3): number;
    length(): number;
    normalize(): this;
    multiplyScalar(value: number): this;
    set(x: number, y: number, z: number): this;
    setScalar(value: number): this;
    toArray(): [number, number, number];
  }

  class BufferGeometry {
    setFromPoints(points: Vector3[]): this;
  }

  class Vector2 {
    constructor(x?: number, y?: number);
  }

  class Color {
    constructor(color?: string | number);
    set(color: string | number): this;
    setRGB(r: number, g: number, b: number): this;
    copy(color: Color): this;
    multiplyScalar(value: number): this;
  }

  class CatmullRomCurve3 {
    constructor(points: Vector3[]);
    getPoints(divisions?: number): Vector3[];
  }

  class Line extends Object3D {
    geometry: BufferGeometry;
    material: LineBasicMaterial;
  }

  class LineBasicMaterial {
    color: Color;
    opacity: number;
  }

  class ShaderMaterial {
    constructor(options?: any);
    uniforms: { [name: string]: { value: any } };
    dispose(): void;
  }

  class CanvasTexture {
    constructor(canvas: HTMLCanvasElement);
    minFilter: unknown;
  }

  class SpriteMaterial {
    constructor(options?: any);
    map?: CanvasTexture | null;
  }

  class Sprite extends Object3D {
    constructor(material?: SpriteMaterial);
    material: SpriteMaterial;
  }

  class Mesh extends Object3D {
    isMesh: boolean;
    material: any;
  }

  const FrontSide: unknown;
  const AdditiveBlending: unknown;
  const LinearFilter: unknown;
}

declare module "three" {
  export import Object3D = THREE.Object3D;
  export import Group = THREE.Group;
  export import Vector2 = THREE.Vector2;
  export import Vector3 = THREE.Vector3;
  export import Color = THREE.Color;
  export import BufferGeometry = THREE.BufferGeometry;
  export import CatmullRomCurve3 = THREE.CatmullRomCurve3;
  export import Line = THREE.Line;
  export import LineBasicMaterial = THREE.LineBasicMaterial;
  export import Mesh = THREE.Mesh;
  export import ShaderMaterial = THREE.ShaderMaterial;
  export import CanvasTexture = THREE.CanvasTexture;
  export import SpriteMaterial = THREE.SpriteMaterial;
  export import Sprite = THREE.Sprite;
  export const FrontSide: typeof THREE.FrontSide;
  export const AdditiveBlending: typeof THREE.AdditiveBlending;
  export const LinearFilter: typeof THREE.LinearFilter;
}

declare module "prop-types" {
  const PropTypes: any;
  export default PropTypes;
}

declare module "ws" {
  export default class WebSocket {
    static OPEN: number;
    static CLOSED: number;
    static CLOSING: number;
    static CONNECTING: number;

    readonly readyState: number;

    constructor(url: string, protocols?: string | string[]);
    on(eventName: string, listener: (...args: any[]) => void): this;
    send(data: any): void;
    close(code?: number, reason?: string): void;
  }
}

declare module "lucide-react" {
  const icons: { [key: string]: any };
  export = icons;
  export as namespace LucideReact;
}
