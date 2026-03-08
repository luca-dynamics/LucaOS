/**
 * Voice Permission Utilities
 * Handles microphone permission requests for voice onboarding
 */

/**
 * Request microphone permission
 */
export async function requestVoicePermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    // Stop immediately, we just needed permission
    stream.getTracks().forEach((track) => track.stop());

    console.log("[Voice] Microphone permission granted");
    return true;
  } catch (error) {
    console.error("[Voice] Microphone permission denied:", error);
    return false;
  }
}

/**
 * Request camera permission (for Presence & Mood)
 */
export async function requestCameraPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });

    // Stop tracks
    stream.getTracks().forEach((track) => track.stop());

    console.log("[Awareness] Camera permission granted");
    return true;
  } catch (error) {
    console.error("[Awareness] Camera permission denied:", error);
    return false;
  }
}

/**
 * Request screen capture permission (for Observation)
 */
export async function requestScreenPermission(): Promise<boolean> {
  if (
    !navigator.mediaDevices ||
    !(navigator.mediaDevices as any).getDisplayMedia
  ) {
    console.warn("[Awareness] getDisplayMedia not supported");
    return false;
  }

  try {
    const stream = await (navigator.mediaDevices as any).getDisplayMedia({
      video: true,
    });

    // Stop tracks
    stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());

    console.log("[Awareness] Screen capture permission granted");
    return true;
  } catch (error) {
    console.error("[Awareness] Screen capture permission denied:", error);
    return false;
  }
}

/**
 * Check if voice permission is already granted
 */
export async function checkVoicePermission(): Promise<boolean> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.warn("[Voice] MediaDevices API not available");
    return false;
  }

  try {
    const result = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });
    return result.state === "granted";
  } catch {
    // Fallback: try to request access
    return await requestVoicePermission();
  }
}

/**
 * Check if screen capture is supported
 */
export function isScreenCaptureSupported(): boolean {
  return !!(
    navigator.mediaDevices && (navigator.mediaDevices as any).getDisplayMedia
  );
}

/**
 * Request ALL permissions at once (Microphone, Camera, Screen)
 */
export async function requestAllWebPermissions(): Promise<{
  audio: boolean;
  video: boolean;
  screen: boolean;
}> {
  const audio = await requestVoicePermission();
  const video = await requestCameraPermission();
  const screen = await requestScreenPermission();

  return { audio, video, screen };
}
