export type MiniChatMessageSource = "miniChat" | "dashboard" | "widget" | "hologram" | "legacy" | (string & {});

export type MiniChatRouteStatus = "pending" | "streaming" | "complete" | "error" | (string & {});

export type MiniChatJsonRecord = Record<string, unknown>;

export interface MiniChatMessageRequest extends MiniChatJsonRecord {
  text?: string;
  source?: MiniChatMessageSource;
  requestId?: string;
  id?: string;
  timestamp?: number | string;
  attachments?: unknown;
  attachment?: unknown;
  image?: unknown;
  screenContext?: unknown;
  screen?: unknown;
  displayId?: unknown;
  persona?: string;
  model?: string;
  modelId?: string;
  brainModel?: string;
  brainId?: string;
  activeBrainId?: string;
}

export interface MiniChatMessageRouteEnvelope extends MiniChatJsonRecord {
  type: "miniChat/message";
  request: MiniChatMessageRequest;
  status?: MiniChatRouteStatus;
  source?: MiniChatMessageSource;
  requestId?: string;
  timestamp?: number | string;
}

export interface MiniChatMessageReply extends MiniChatJsonRecord {
  text?: string;
  requestId?: string;
  id?: string;
  status?: MiniChatRouteStatus;
  generatedImage?: unknown;
  generatedVideo?: unknown;
  tacticalData?: unknown;
}

export interface MiniChatStreamChunk extends MiniChatJsonRecord {
  id?: string;
  requestId?: string;
  text?: string;
  isComplete?: boolean;
  status?: MiniChatRouteStatus;
  generatedImage?: unknown;
  generatedVideo?: unknown;
  tacticalData?: unknown;
}
