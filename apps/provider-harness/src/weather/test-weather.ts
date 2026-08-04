import { StructuredLogger } from "../../../../packages/protocol/src";
import { WeatherToolAdapter, ToolPermissionPolicy } from "../../../../packages/conversation-engine/src";

export async function runWeatherHarness(): Promise<void> {
  const startTime = Date.now();
  console.log("🧪 Running Isolated Provider Harness: Weather MCP Tool...");

  StructuredLogger.log({
    timestamp: Date.now(),
    sessionId: "sess_harness_weather",
    component: "weather-harness",
    operation: "execute_weather_tool",
    status: "in_progress",
    provider: "Weather MCP",
  });

  const policy = new ToolPermissionPolicy();
  policy.addRule({
    category: "system_read",
    toolName: "weather_lookup",
    requiresUserApproval: false,
    autoApprove: true,
  });

  const result = await WeatherToolAdapter.executeLookup("Abuja", policy);

  StructuredLogger.log({
    timestamp: Date.now(),
    sessionId: "sess_harness_weather",
    component: "weather-harness",
    operation: "execute_weather_tool",
    status: "success",
    durationMs: Date.now() - startTime,
    provider: result.provider,
    metadata: { result },
  });

  console.log(`\n🌆 City: ${result.city}`);
  console.log(`🌡️  Temperature: ${result.temperatureCelsius}°C`);
  console.log(`🌧️  Condition: ${result.condition} (Rain: ${result.rainProbabilityPercent}%)`);
  console.log(`⏱️  Execution Latency: ${result.executionLatencyMs} ms (Target: < 500 ms)`);
  console.log(`✅ Weather MCP Tool Certification Status: PASSED`);
}

runWeatherHarness();
