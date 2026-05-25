import {
  ComputerUseExecutionMode,
  ComputerUseFocusContext,
  ComputerUseFocusContextBuilderOptions,
  CursorPoint,
  FocusedElement,
  ScreenRegion,
  ScreenshotReference,
  UserPointedTarget,
} from "./types";

export class ComputerUseFocusContextBuilder {
  private options: ComputerUseFocusContextBuilderOptions;
  private context: ComputerUseFocusContext;

  constructor(options: ComputerUseFocusContextBuilderOptions = {}) {
    this.options = options;
    this.context = this.createBaseContext(options);
  }

  createBaseContext(options: ComputerUseFocusContextBuilderOptions = {}): ComputerUseFocusContext {
    const executionMode: ComputerUseExecutionMode = options.executionMode ?? "sandbox";
    const riskLevel = options.riskLevel ?? "safe";
    const trustTier = options.trustTier ?? "verified";
    const prefersSandbox = trustTier === "untrusted" || executionMode === "sandbox";
    const requiresGuardApproval = riskLevel === "dangerous" && options.guardApprovalProvided !== true;

    return {
      executionMode: prefersSandbox ? "sandbox" : executionMode,
      riskLevel,
      trustTier,
      requiresGuardApproval,
      prefersSandbox,
      focusSignals: [],
      metadata: {
        contextOnly: true,
        actionsEnabled: false,
        systemApisEnabled: false,
      },
    };
  }

  withCursorPoint(cursorPoint: CursorPoint): this {
    this.context.cursorPoint = cursorPoint;
    this.context.focusSignals.push({
      kind: "cursor_point",
      source: "system",
      createdAt: this.now(),
    });
    return this;
  }

  withScreenRegion(screenRegion: ScreenRegion): this {
    this.context.screenRegion = screenRegion;
    this.context.focusSignals.push({
      kind: "screen_region",
      source: "model",
      createdAt: this.now(),
    });
    return this;
  }

  withFocusedElement(focusedElement: FocusedElement): this {
    this.context.focusedElement = focusedElement;
    this.context.focusSignals.push({
      kind: "focused_element",
      source: "system",
      createdAt: this.now(),
    });
    return this;
  }

  withScreenshotReference(screenshotReference: ScreenshotReference): this {
    this.context.screenshotReference = screenshotReference;
    this.context.focusSignals.push({
      kind: "screenshot_reference",
      source: "system",
      createdAt: this.now(),
    });
    return this;
  }

  withUserPointedTarget(userPointedTarget: UserPointedTarget): this {
    this.context.userPointedTarget = userPointedTarget;
    this.context.focusSignals.push({
      kind: "user_pointed_target",
      source: "user",
      createdAt: this.now(),
      highValueGrounding: true,
    });
    return this;
  }

  build(): ComputerUseFocusContext {
    return {
      ...this.context,
      focusSignals: [...this.context.focusSignals],
    };
  }

  reset(): this {
    this.context = this.createBaseContext(this.options);
    return this;
  }

  private now(): string {
    return this.options.now?.() ?? new Date().toISOString();
  }
}
