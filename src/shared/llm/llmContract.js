export function parseToolArguments(raw) {
  if (raw === undefined || raw === null || raw === "") return {};
  if (typeof raw === "object") return raw;
  return JSON.parse(raw);
}

export function normalizeToolCalls(toolCalls) {
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) return undefined;
  return toolCalls;
}

/**
 * The media type assumed for a bare base64 image. Every caller before
 * RFC-0006 Stage 2 Change 3 hardcoded this in each wire module, so it stays the
 * default: a raw base64 string keeps producing byte-identical requests.
 */
export const DEFAULT_IMAGE_MIME_TYPE = "image/jpeg";

const DATA_URL_PREFIX = /^data:([a-z]+\/[a-z0-9.+-]+);base64,/i;

/**
 * Splits an image into the base64 payload and its media type, so a wire module
 * can label it correctly without every caller threading a mime type down.
 *
 * Accepts either form:
 *   "AAAA"                            -> { data: "AAAA", mimeType: "image/jpeg" }
 *   "data:image/png;base64,AAAA"      -> { data: "AAAA", mimeType: "image/png" }
 *
 * A non-string is passed through untouched rather than dropped: the vendor
 * rejects it loudly, which is better than sending an empty image.
 */
export function resolveImagePayload(image) {
  if (typeof image !== "string") {
    return { data: image, mimeType: DEFAULT_IMAGE_MIME_TYPE };
  }

  const match = DATA_URL_PREFIX.exec(image);
  if (!match) return { data: image, mimeType: DEFAULT_IMAGE_MIME_TYPE };

  return {
    data: image.slice(match[0].length),
    mimeType: match[1].toLowerCase(),
  };
}
