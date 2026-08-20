export function parseToolArguments(raw) {
  if (raw === undefined || raw === null || raw === "") return {};
  if (typeof raw === "object") return raw;
  return JSON.parse(raw);
}

export function normalizeToolCalls(toolCalls) {
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) return undefined;
  return toolCalls;
}
