export class LucaPlatformError extends Error {
  constructor(public code: string, message: string, public details?: unknown) {
    super(`[${code}] ${message}`);
    this.name = "LucaPlatformError";
  }
}

export class ModelProviderError extends LucaPlatformError {
  constructor(providerId: string, message: string) {
    super("ERR_MODEL_PROVIDER", `Provider '${providerId}' failed: ${message}`);
    this.name = "ModelProviderError";
  }
}

export class ToolExecutionError extends LucaPlatformError {
  constructor(toolName: string, message: string) {
    super("ERR_TOOL_EXECUTION", `Tool '${toolName}' execution failed: ${message}`);
    this.name = "ToolExecutionError";
  }
}

export class PermissionDeniedError extends LucaPlatformError {
  constructor(resource: string) {
    super("ERR_PERMISSION_DENIED", `Permission denied for resource '${resource}'`);
    this.name = "PermissionDeniedError";
  }
}
