import type {
  MiniChatJsonRecord,
  MiniChatMessageReply,
  MiniChatMessageRequest,
  MiniChatMessageSource,
  MiniChatStreamChunk,
} from "./miniChatMessageTypes";

function isRecord(value: unknown): value is MiniChatJsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneRecord(payload: unknown): MiniChatJsonRecord {
  return isRecord(payload) ? { ...payload } : {};
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function getMiniChatMessageText(payload: unknown): string {
  if (!isRecord(payload)) return "";
  return typeof payload.text === "string" ? payload.text : "";
}

export function createMiniChatMessageRequest(payload: unknown = {}): MiniChatMessageRequest {
  const request = cloneRecord(payload) as MiniChatMessageRequest;
  if (request.source === undefined) {
    request.source = "miniChat";
  }
  return request;
}

export function isMiniChatMessageRequest(payload: unknown): payload is MiniChatMessageRequest {
  return isRecord(payload) && (payload.text === undefined || typeof payload.text === "string");
}

export function toLegacyChatWidgetMessage(
  request: MiniChatMessageRequest,
  legacyPayload?: unknown,
): MiniChatMessageRequest {
  return {
    ...cloneRecord(legacyPayload),
    ...cloneRecord(request),
  } as MiniChatMessageRequest;
}

export function createMiniChatMessageRouteEnvelope(
  request: MiniChatMessageRequest,
): {
  type: "miniChat/message";
  request: MiniChatMessageRequest;
  status: "pending";
  source?: MiniChatMessageSource;
  requestId?: string;
  timestamp?: number | string;
} {
  return {
    type: "miniChat/message",
    request: createMiniChatMessageRequest(request),
    status: "pending",
    source: request.source,
    requestId: optionalString(request.requestId) ?? optionalString(request.id),
    timestamp: request.timestamp as number | string | undefined,
  };
}

export function createMiniChatReply(payload: unknown = {}): MiniChatMessageReply {
  if (typeof payload === "string") {
    return { text: payload };
  }
  return cloneRecord(payload) as MiniChatMessageReply;
}

export function createMiniChatStreamChunk(payload: unknown = {}): MiniChatStreamChunk {
  return cloneRecord(payload) as MiniChatStreamChunk;
}
