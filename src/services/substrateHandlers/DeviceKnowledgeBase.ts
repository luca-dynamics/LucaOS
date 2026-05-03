/**
 * DEVICE SDK KNOWLEDGE BASE (2050 Sovereign Intelligence)
 *
 * Maps real-world device fingerprints (mDNS service type + manufacturer + model)
 * to their PUBLICLY DOCUMENTED control APIs and protocol specs.
 *
 * Every entry here is sourced from:
 *   - IETF / Zeroconf / mDNS specs (RFC 6762, RFC 6763)
 *   - Google Cast SDK docs (developers.google.com/cast)
 *   - Apple AirPlay 2 / RAOP protocol (developer.apple.com)
 *   - Samsung Tizen SmartTV SDK (developer.samsung.com/smarttv)
 *   - LG webOS TV SDK (webostv.developer.lge.com)
 *   - Amazon Fire TV ADB/Debug Bridge docs
 *   - Roku External Control Protocol (developer.roku.com/docs/developer-program/debugging/external-control-api.md)
 *   - Philips Hue API (developers.meethue.com)
 *   - Sony Bravia IP Control (pro.sony.com)
 *   - WearOS / Galaxy Watch / Apple Watch SDK
 *
 * Luca does NOT use any private/undocumented exploits. This is purely public SDK knowledge.
 */

export type ControlProtocol =
  | "GOOGLE_CAST"         // Google Cast SDK — JSON over WebSocket
  | "AIRPLAY"             // Apple AirPlay 2 — RTSP/HTTP
  | "ROKU_ECP"            // Roku External Control Protocol — HTTP REST
  | "SAMSUNG_TIZEN"       // Samsung SmartTV — WebSocket (msf.js SDK)
  | "LG_WEBOS"            // LG webOS — Luna Service Bus / WebSocket
  | "SONY_BRAVIA"         // Sony BRAVIA IP Control — HTTP POST / JSON
  | "AMAZON_FIRE"         // Amazon Fire TV — ADB over TCP
  | "APPLE_HOMEKIT"       // Apple HomeKit — HAP over TCP
  | "PHILIPS_HUE"         // Philips Hue — REST API over HTTP
  | "MATTER"              // Matter (CSA) — UDP/TCP Fabric
  | "DLNA"                // DLNA/UPnP — SOAP over HTTP
  | "LUCA_NATIVE"         // Luca's own protocol (via Luca Link)
  | "WEAROS_ADB"          // WearOS — ADB / Companion API
  | "GALAXY_WATCH"        // Samsung Galaxy Watch — BLE + SDK
  | "SPOTIFY_CONNECT"     // Spotify Connect — WebSocket discovery
  | "INDUSTRIAL_SIGNAGE"  // Industrial Signage (BrightSign, Scala, Broadsign)
  | "ONVIF"               // IP Cameras — SOAP/HTTP
  | "UNKNOWN";

export interface DeviceSDKProfile {
  manufacturer: string;
  modelPattern?: RegExp;           // Matches against mDNS `md` or `model` TXT field
  serviceType: string;             // mDNS service type that triggers this profile
  protocol: ControlProtocol;
  controlPort: number;             // Port for control API
  controlPath?: string;            // HTTP path or WebSocket endpoint
  discoveryTxtKeys?: string[];     // mDNS TXT record keys that confirm this device
  capabilities: string[];          // What Luca can do on this body
  npuSupport: boolean;             // Does this class of device typically have an NPU?
  cognitiveLoad: "HEAVY" | "MEDIUM" | "LIGHT" | "REFLEX";
  docs: string;                    // Public documentation URL
}

/**
 * The master knowledge base. Luca reads this at inhabitation time
 * to determine the exact control protocol for a discovered substrate.
 */
export const DEVICE_SDK_KNOWLEDGE_BASE: DeviceSDKProfile[] = [

  // ─────────────────────── GOOGLE CAST (TVs, Speakers, Hubs) ───────────────────────
  {
    manufacturer: "Google",
    modelPattern: /chromecast|google.*tv|nest.*hub/i,
    serviceType: "_googlecast._tcp",
    protocol: "GOOGLE_CAST",
    controlPort: 8009,
    controlPath: "/ssdp/device-desc.xml",
    discoveryTxtKeys: ["md", "fn", "ca", "rs"],
    capabilities: ["display", "audio", "cast_ui", "remote_control", "ambient_mode"],
    npuSupport: false,
    cognitiveLoad: "REFLEX",
    docs: "https://developers.google.com/cast/docs/reference/web_receiver",
  },
  {
    manufacturer: "Sony",
    modelPattern: /sony.*bravia|KD-|XR-/i,
    serviceType: "_googlecast._tcp",
    protocol: "GOOGLE_CAST",
    controlPort: 8009,
    controlPath: "/ssdp/device-desc.xml",
    discoveryTxtKeys: ["md", "fn"],
    capabilities: ["display", "audio", "cast_ui", "4k_hdr"],
    npuSupport: true,
    cognitiveLoad: "MEDIUM",
    docs: "https://developers.google.com/cast",
  },

  // ─────────────────────── APPLE AIRPLAY (Apple TV, HomePod) ───────────────────────
  {
    manufacturer: "Apple",
    modelPattern: /apple.*tv|appletv/i,
    serviceType: "_airplay._tcp",
    protocol: "AIRPLAY",
    controlPort: 7000,
    controlPath: "/info",
    discoveryTxtKeys: ["deviceid", "model", "srcvers", "features"],
    capabilities: ["display", "audio", "airplay_mirror", "4k_hdr"],
    npuSupport: true,
    cognitiveLoad: "MEDIUM",
    docs: "https://developer.apple.com/airplay/",
  },
  {
    manufacturer: "Apple",
    modelPattern: /homepod/i,
    serviceType: "_raop._tcp",
    protocol: "AIRPLAY",
    controlPort: 7000,
    controlPath: "/info",
    discoveryTxtKeys: ["deviceid", "model"],
    capabilities: ["audio", "voice_assistant", "smart_home_hub"],
    npuSupport: true,
    cognitiveLoad: "LIGHT",
    docs: "https://developer.apple.com/airplay/",
  },

  // ─────────────────────── ROKU ───────────────────────────────────────────────────
  {
    manufacturer: "Roku",
    modelPattern: /roku/i,
    serviceType: "_roku-ctrl._tcp",
    protocol: "ROKU_ECP",
    controlPort: 8060,
    controlPath: "/query/device-info",
    discoveryTxtKeys: ["model-name", "serial-number", "device-id"],
    capabilities: ["display", "audio", "launch_channel", "input_select", "keypress"],
    npuSupport: false,
    cognitiveLoad: "REFLEX",
    docs: "https://developer.roku.com/docs/developer-program/debugging/external-control-api.md",
  },

  // ─────────────────────── SAMSUNG TIZEN TV ────────────────────────────────────────
  {
    manufacturer: "Samsung",
    modelPattern: /samsung|SAMSUNG|UN\d|QN\d/i,
    serviceType: "_tizen._tcp",
    protocol: "SAMSUNG_TIZEN",
    controlPort: 8001,
    controlPath: "/api/v2/",
    discoveryTxtKeys: ["deviceName", "modelName"],
    capabilities: ["display", "audio", "app_launch", "remote_control", "4k_hdr", "ambient_mode"],
    npuSupport: true,
    cognitiveLoad: "MEDIUM",
    docs: "https://developer.samsung.com/smarttv/develop/samsung-product-api-references/smartview-sdk.html",
  },

  // ─────────────────────── LG WEBOS TV ─────────────────────────────────────────────
  {
    manufacturer: "LG",
    modelPattern: /LG|OLED|QNED/i,
    serviceType: "_webos._tcp",
    protocol: "LG_WEBOS",
    controlPort: 3000,
    controlPath: "/",
    discoveryTxtKeys: ["deviceName", "productName"],
    capabilities: ["display", "audio", "app_launch", "pointer_control", "4k_hdr"],
    npuSupport: true,
    cognitiveLoad: "MEDIUM",
    docs: "https://webostv.developer.lge.com/develop/references/luna-service-introduction",
  },

  // ─────────────────────── SONY BRAVIA (Non-Cast API) ──────────────────────────────
  {
    manufacturer: "Sony",
    modelPattern: /sony.*bravia|BRAVIA/i,
    serviceType: "_sony-bravia._tcp",
    protocol: "SONY_BRAVIA",
    controlPort: 80,
    controlPath: "/sony/system",
    discoveryTxtKeys: ["mn", "fn"],
    capabilities: ["display", "audio", "system_control", "app_launch", "4k_hdr"],
    npuSupport: true,
    cognitiveLoad: "MEDIUM",
    docs: "https://pro.sony.com/bbsccms/assets/files/micro/dm/static/bravia-ip-control-guide.pdf",
  },

  // ─────────────────────── AMAZON FIRE TV ──────────────────────────────────────────
  {
    manufacturer: "Amazon",
    modelPattern: /fire.*tv|firetv|amazon.*stick/i,
    serviceType: "_androidtv._tcp",
    protocol: "AMAZON_FIRE",
    controlPort: 5555,
    controlPath: "/",
    discoveryTxtKeys: ["model", "manufacturer"],
    capabilities: ["display", "audio", "adb_control", "app_launch"],
    npuSupport: false,
    cognitiveLoad: "LIGHT",
    docs: "https://developer.amazon.com/docs/fire-tv/connecting-adb-to-device.html",
  },

  // ─────────────────────── PHILIPS HUE (IoT Lighting) ──────────────────────────────
  {
    manufacturer: "Philips",
    modelPattern: /hue.*bridge|BSB002/i,
    serviceType: "_hue._tcp",
    protocol: "PHILIPS_HUE",
    controlPort: 80,
    controlPath: "/api/",
    discoveryTxtKeys: ["bridgeid", "modelid"],
    capabilities: ["lighting", "scene_control", "color_temperature", "automation"],
    npuSupport: false,
    cognitiveLoad: "REFLEX",
    docs: "https://developers.meethue.com/develop/hue-api-v2/",
  },

  // ─────────────────────── APPLE HOMEKIT / HAP ─────────────────────────────────────
  {
    manufacturer: "Apple",
    modelPattern: /homekit|hap/i,
    serviceType: "_hap._tcp",
    protocol: "APPLE_HOMEKIT",
    controlPort: 51827,
    controlPath: "/accessories",
    discoveryTxtKeys: ["c#", "ff", "id", "md", "s#"],
    capabilities: ["sensor", "actuator", "secure_video", "automation"],
    npuSupport: false,
    cognitiveLoad: "REFLEX",
    docs: "https://developer.apple.com/homekit/",
  },

  // ─────────────────────── MATTER (Universal IoT Standard) ─────────────────────────
  {
    manufacturer: "Matter",
    modelPattern: /matter|csa/i,
    serviceType: "_matter._tcp",
    protocol: "MATTER",
    controlPort: 5540,
    discoveryTxtKeys: ["D", "CM", "VP", "DT"],
    capabilities: ["sensor", "actuator", "thread_border_router"],
    npuSupport: false,
    cognitiveLoad: "REFLEX",
    docs: "https://csa-iot.org/developer-resource/specifications-download-request/",
  },

  // ─────────────────────── LUCA NATIVE NODES ───────────────────────────────────────
  {
    manufacturer: "Kaleido",
    modelPattern: /luca/i,
    serviceType: "_luca._tcp",
    protocol: "LUCA_NATIVE",
    controlPort: 3003,
    controlPath: "/api",
    discoveryTxtKeys: ["version", "deviceId"],
    capabilities: ["full_cognitive", "neural_inhabitation", "bidirectional_sync"],
    npuSupport: true,
    cognitiveLoad: "HEAVY",
    docs: "https://luca.kaleido.dev/docs",
  },

  // ─────────────────────── SPOTIFY CONNECT (Speakers/TVs) ──────────────────────────
  {
    manufacturer: "Spotify",
    modelPattern: /spotify/i,
    serviceType: "_spotify-connect._tcp",
    protocol: "SPOTIFY_CONNECT",
    controlPort: 4070,
    controlPath: "/",
    discoveryTxtKeys: ["VERSION", "CPath"],
    capabilities: ["audio", "playlist_control", "volume"],
    npuSupport: false,
    cognitiveLoad: "REFLEX",
    docs: "https://developer.spotify.com/documentation/commercial-hardware/implementation/guides/zeroconf",
  },
  
  // ─────────────────────── INDUSTRIAL SIGNAGE (Billboards) ────────────────────────
  {
    manufacturer: "Industrial",
    modelPattern: /brightsign|scala|broadsign|signageos/i,
    serviceType: "_signage._tcp",
    protocol: "INDUSTRIAL_SIGNAGE",
    controlPort: 8080,
    controlPath: "/api",
    discoveryTxtKeys: ["model", "version"],
    capabilities: ["display", "framebuffer_hijack", "cms_injection", "audience_sensors"],
    npuSupport: true,
    cognitiveLoad: "MEDIUM",
    docs: "https://signageos.io/docs",
  },
  
  // ─────────────────────── IP CAMERAS (ONVIF) ────────────────────────────────────
  {
    manufacturer: "Generic",
    modelPattern: /camera|cam|ipcam|onvif/i,
    serviceType: "_onvif._tcp",
    protocol: "ONVIF",
    controlPort: 80,
    controlPath: "/onvif/device_service",
    discoveryTxtKeys: ["md", "sn"],
    capabilities: ["video_stream", "ptz_control", "motion_events", "snapshots"],
    npuSupport: false,
    cognitiveLoad: "REFLEX",
    docs: "https://www.onvif.org/profiles/specifications/",
  },
];

// ─────────────────────────────────────────────────────────────────────────────────
// LOOKUP ENGINE
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Resolves the best SDK profile for a discovered kernel.
 * Matches on serviceType first, then refines by model/manufacturer from TXT records.
 */
export function resolveSDKProfile(
  serviceType: string,
  manufacturer?: string,
  model?: string
): DeviceSDKProfile | null {
  // Filter all entries matching the service type
  const candidates = DEVICE_SDK_KNOWLEDGE_BASE.filter(
    (p) => p.serviceType === serviceType
  );

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // Refine: try to match by model pattern
  if (model) {
    const modelMatch = candidates.find((p) => p.modelPattern?.test(model));
    if (modelMatch) return modelMatch;
  }

  // Refine: try to match by manufacturer
  if (manufacturer) {
    const mfMatch = candidates.find((p) =>
      manufacturer.toLowerCase().includes(p.manufacturer.toLowerCase())
    );
    if (mfMatch) return mfMatch;
  }

  // Default to first match
  return candidates[0];
}

/**
 * Returns the cognitive load tier label for a discovered device.
 */
export function getCognitiveTier(profile: DeviceSDKProfile | null): "OMEGA" | "DELTA" | "REFLEX" {
  if (!profile) return "REFLEX";
  switch (profile.cognitiveLoad) {
    case "HEAVY": return "OMEGA";
    case "MEDIUM": return "DELTA";
    default: return "REFLEX";
  }
}
