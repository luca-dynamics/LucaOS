export type BrowserRuntimeAction =
  | "navigate"
  | "click"
  | "type"
  | "extract"
  | "screenshot";


export interface BrowserRuntimeRequest {
  requestId: string;
  missionId: string;
  action: BrowserRuntimeAction;
  target?: string;
  payload?: Record<string, unknown>;
  issuedAt: string;

}

export interface BrowserRuntimeRouteResult {
  accepted: boolean;

  reason?: string;
}

export interface BrowserRuntimeAdapter {
  canHandle(request: BrowserRuntimeRequest): boolean;
  execute(request: BrowserRuntimeRequest): Promise<BrowserRuntimeRouteResult>;
}

