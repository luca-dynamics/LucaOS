/**
 * Voice Cloning Service
 * Handles audio recording, upload, and storage for voice cloning feature
 */

interface ClonedVoice {
  id: string;
  name: string;
  audioBlob: Blob;
  createdAt: number;
  duration: number;
}

class VoiceCloneService {
  private dbName = "luca-voice-clones";
  private storeName = "voices";
  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "id" });
        }
      };
    });
  }

  /**
   * Record audio from microphone
   */
  async recordVoice(durationSeconds: number = 5): Promise<Blob> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];

    return new Promise((resolve, reject) => {
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        resolve(blob);
      };
      mediaRecorder.onerror = (e) => reject(e);

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), durationSeconds * 1000);
    });
  }

  /**
   * Process uploaded audio file
   */
  async uploadVoice(file: File): Promise<Blob> {
    // Validate file type
    const validTypes = [
      "audio/wav",
      "audio/mp3",
      "audio/mpeg",
      "audio/m4a",
      "audio/webm",
    ];
    if (!validTypes.some((type) => file.type.includes(type.split("/")[1]))) {
      throw new Error("Invalid audio format. Please use WAV, MP3, or M4A.");
    }

    // Validate duration (should be ~5 seconds)
    const audio = new Audio(URL.createObjectURL(file));
    await new Promise((resolve) => {
      audio.onloadedmetadata = resolve;
    });

    if (audio.duration < 3 || audio.duration > 10) {
      throw new Error("Audio must be between 3-10 seconds long.");
    }

    return file;
  }

  /**
   * Save cloned voice to IndexedDB
   */
  async saveVoice(audioBlob: Blob, name: string): Promise<string> {
    if (!this.db) await this.init();

    const id = `voice_${Date.now()}`;
    const voice: ClonedVoice = {
      id,
      name,
      audioBlob,
      createdAt: Date.now(),
      duration: 5,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.add(voice);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all cloned voices
   */
  async getVoices(): Promise<ClonedVoice[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get specific cloned voice
   */
  async getVoice(id: string): Promise<ClonedVoice | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete cloned voice
   */
  async deleteVoice(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Convert Blob to Base64 for API transmission
   */
  async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export const voiceCloneService = new VoiceCloneService();
export type { ClonedVoice };
