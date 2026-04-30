import * as GoogleAI from "@google/generative-ai";
import { settingsService } from "./settingsService";

// --- CONFIGURATION ---
// API Key should be set via environment variable: VITE_API_KEY (for Vite/browser) or API_KEY (for Node.js)
const isValidGeminiKey = (key: string | null | undefined): key is string => {
  if (!key) return false;
  // Valid Gemini API keys always start with "AIza" and are exactly 39 characters long
  return (
    typeof key === "string" &&
    key.trim().startsWith("AIza") &&
    key.trim().length > 30
  );
};

export const getApiKey = () => {
  // 1. Check Settings Service
  const brainSettings = settingsService.get("brain");
  const settingsKey = brainSettings?.geminiApiKey;

  if (isValidGeminiKey(settingsKey)) {
    // console.log("[genAIClient] Found Valid API Key in Settings Service");
    return settingsKey;
  }

  // 2. Check LocalStorage Backup (Redundant Check)
  if (typeof localStorage !== "undefined") {
    const backupKey = localStorage.getItem("GEMINI_API_KEY");
    if (isValidGeminiKey(backupKey)) {
      // console.log("[genAIClient] Found Valid API Key in Backup LocalStorage");
      return backupKey;
    }
  }

  // 3. Try Vite environment variable (browser context)
  if (typeof import.meta !== "undefined" && import.meta.env) {
    const key =
      import.meta.env.VITE_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || "";
    if (isValidGeminiKey(key)) {
      // console.log("[genAIClient] Found Valid API Key in Environment Variables");
      return key;
    }
  }

  // 4. Try ALL possible environment variable sources (comprehensive check)
  let envKey = "";

  if (typeof import.meta !== "undefined" && import.meta.env) {
    envKey =
      import.meta.env.VITE_API_KEY ||
      import.meta.env.VITE_GEMINI_API_KEY ||
      import.meta.env.API_KEY ||
      "";
  }

  if (!envKey && typeof process !== "undefined" && process.env) {
    envKey =
      process.env.VITE_API_KEY ||
      process.env.API_KEY ||
      process.env.GEMINI_API_KEY ||
      "";
  }

  if (!envKey && typeof window !== "undefined" && (window as any).__ENV__) {
    envKey =
      (window as any).__ENV__.VITE_API_KEY ||
      (window as any).__ENV__.API_KEY ||
      "";
  }

  if (isValidGeminiKey(envKey)) {
    // console.log("[genAIClient] Found Valid API Key in Environment Variables");
    return envKey;
  }

  console.warn(
    "[genAIClient] No valid API Key found (or found a dummy key). Please ensure your key starts with 'AIza...'",
  );
  return "";
};

export const SYSTEM_API_KEY = getApiKey();

const getBaseUrl = (): string | undefined => {
  // 1. Check Settings Service
  const settingsBaseUrl = settingsService.get("brain")?.geminiBaseUrl;
  if (settingsBaseUrl && settingsBaseUrl.trim().length > 5)
    return settingsBaseUrl;

  // 2. Check LocalStorage
  if (typeof localStorage !== "undefined") {
    const backupUrl = localStorage.getItem("GEMINI_BASE_URL");
    if (backupUrl && backupUrl.trim().length > 5) return backupUrl;
  }

  // 3. Check Environment Variables
  let envUrl = "";
  if (typeof import.meta !== "undefined" && import.meta.env) {
    envUrl =
      import.meta.env.VITE_GEMINI_BASE_URL ||
      import.meta.env.VITE_BASE_URL ||
      "";
  }
  if (!envUrl && typeof process !== "undefined" && process.env) {
    envUrl =
      process.env.VITE_GEMINI_BASE_URL || process.env.GEMINI_BASE_URL || "";
  }
  if (!envUrl && typeof window !== "undefined" && (window as any).__ENV__) {
    envUrl = (window as any).__ENV__.VITE_GEMINI_BASE_URL || "";
  }

  return envUrl && envUrl.trim().length > 5 ? envUrl : undefined;
};

// Start with initial key or dummy if missing (to prevent crash)
let currentGenAI: GoogleAI.GoogleGenerativeAI | null = null;
let currentKey: string | null = null;
let currentBaseUrl: string | undefined = undefined;

const initClient = (key: string): GoogleAI.GoogleGenerativeAI => {
  if (!key) {
    throw new Error("Cannot initialize GoogleGenerativeAI with empty API key");
  }

  const baseUrl = getBaseUrl();
  console.log(
    `[genAIClient] Initializing new GoogleGenerativeAI client (Key: ${key.substring(
      0,
      4,
    )}...${key.substring(key.length - 4)}${baseUrl ? `, BaseUrl: ${baseUrl}` : ""})`,
  );

  currentKey = key;
  currentBaseUrl = baseUrl;

  const clientConfig: any = { 
    apiKey: key,
    apiVersion: "v1beta" 
  };
  if (baseUrl) {
    clientConfig.baseUrl = baseUrl;
  }

  return new GoogleAI.GoogleGenerativeAI(clientConfig);
};

// Listen for settings changes to immediately invalidate the client
settingsService.on("settings-changed", (settings) => {
  const newKey = settings?.brain?.geminiApiKey;
  const newBaseUrl = settings?.brain?.geminiBaseUrl;

  if ((newKey && newKey !== currentKey) || newBaseUrl !== currentBaseUrl) {
    console.log(
      "[genAIClient] API Config changed in settings, re-initializing client...",
    );
    currentGenAI = initClient(newKey || currentKey || "");
  }
});

// Helper that throws if client is missing (handling the null)
export const getGenClient = (): GoogleAI.GoogleGenerativeAI => {
  const key = getApiKey();
  const baseUrl = getBaseUrl();

  // If no client exists, or key/url has changed, re-init
  if (!currentGenAI || key !== currentKey || baseUrl !== currentBaseUrl) {
    if (key) {
      currentGenAI = initClient(key);
    } else {
      throw new Error(
        "Google GenAI not initialized. Please set VITE_API_KEY or configure settings.",
      );
    }
  }

  if (!currentGenAI) {
    throw new Error("Failed to initialize Google GenAI client.");
  }

  return currentGenAI;
};

export const setGenClient = (client: GoogleAI.GoogleGenerativeAI) => {
  currentGenAI = client;
};
