// ChatIntentRouterBridge — PR #123: Intent Routing Layer
// Thin facade for chat runtime to call routing without deep coupling.
// Does NOT force every message into a plan. Does NOT execute anything.

import { intentRoutingService, type IntentRoutingService } from "./IntentRoutingService";
import { intentRoutingModeService, type IntentRoutingModeService } from "./IntentRoutingModeService";
import type {
  LucaIntentRoutingInput,
  LucaIntentRoutingResult,
  LucaIntentRoute,
} from "../../types/intentRouting";

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

export interface ChatIntentRouterBridgeDependencies {
  routing: Pick<IntentRoutingService, "routeUserMessage" | "getDefaultMode">;
  modeService: Pick<IntentRoutingModeService, "getMode">;
}

// ---------------------------------------------------------------------------
// Result wrapper
// ---------------------------------------------------------------------------

export interface ChatRoutingResult {
  routed: boolean;
  routeType: LucaIntentRoute;
  userFacingPhrase: string;
  createdArtifacts: string;
  noExecutionPerformed: true;
}

// ---------------------------------------------------------------------------
// Bridge
// ---------------------------------------------------------------------------

export class ChatIntentRouterBridge {
  constructor(
    private readonly deps: ChatIntentRouterBridgeDependencies = {
      routing: intentRoutingService,
      modeService: intentRoutingModeService,
    },
  ) {}

  maybeRouteMessageBeforeResponse(input: {
    message: string;
    source?: string;
    sourceId?: string;
    sessionId?: string;
    provenanceIds?: string[];
  }): ChatRoutingResult {
    const mode = this.deps.modeService.getMode();
    const routingInput: LucaIntentRoutingInput = {
      message: input.message,
      mode,
      source: input.source ?? "chat",
      sourceId: input.sourceId,
      sessionId: input.sessionId,
      provenanceIds: input.provenanceIds ?? [`chat:${Date.now()}`],
    };

    const result = this.deps.routing.routeUserMessage(routingInput);
    return this.toResult(result);
  }

  maybeRouteMessageAfterResponse(input: {
    message: string;
    source?: string;
    sourceId?: string;
    sessionId?: string;
    provenanceIds?: string[];
  }): ChatRoutingResult {
    // After-response routing uses the same logic but can be called after
    // the assistant has already replied. Currently identical behavior.
    return this.maybeRouteMessageBeforeResponse(input);
  }

  buildRoutingResponseHint(result: LucaIntentRoutingResult): string {
    if (result.decision.route === "fast_response") return "";
    return result.userFacingSummary;
  }

  private toResult(result: LucaIntentRoutingResult): ChatRoutingResult {
    return {
      routed: result.decision.route !== "fast_response",
      routeType: result.decision.route,
      userFacingPhrase: result.userFacingSummary,
      createdArtifacts: result.createdArtifactsSummary,
      noExecutionPerformed: true,
    };
  }
}

export const chatIntentRouterBridge = new ChatIntentRouterBridge();
