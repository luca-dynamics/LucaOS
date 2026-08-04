import { EngineStateContainer, ToolSnapshot, selectActiveTools } from "../../voice-engine/src";

export interface ToolPanelViewModel {
  tools: readonly ToolSnapshot[];
  activeCount: number;
  hasRunningTools: boolean;
}

export class ToolPresenter {
  public static project(state: EngineStateContainer): ToolPanelViewModel {
    const tools = selectActiveTools(state);
    return {
      tools,
      activeCount: tools.length,
      hasRunningTools: tools.some((t) => t.status === "running" || t.status === "queued"),
    };
  }
}
