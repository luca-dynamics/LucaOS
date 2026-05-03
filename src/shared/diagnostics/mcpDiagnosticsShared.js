export function summarizeMcpConnections(connections = []) {
  const unhealthyConnections = connections.filter((entry) => !entry.isHealthy);

  return {
    totalConnections: connections.length,
    healthyConnections: connections.length - unhealthyConnections.length,
    unhealthyConnections: unhealthyConnections.length,
    connections,
    unhealthyDetails: unhealthyConnections,
  };
}

export function createMcpInfrastructureAuditResult(summary) {
  if (!summary || summary.totalConnections === 0) {
    return {
      id: "infra_mcp",
      name: "MCP Infrastructure",
      status: "warn",
      message: "No MCP servers configured or connected.",
    };
  }

  if (summary.unhealthyConnections > 0) {
    return {
      id: "infra_mcp",
      name: "MCP Infrastructure",
      status: "fail",
      message: `${summary.unhealthyConnections} of ${summary.totalConnections} servers are unhealthy.`,
      details: summary.unhealthyDetails,
    };
  }

  return {
    id: "infra_mcp",
    name: "MCP Infrastructure",
    status: "pass",
    message: `All ${summary.totalConnections} MCP servers are healthy.`,
  };
}
