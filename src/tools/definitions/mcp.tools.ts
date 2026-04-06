import { Type, FunctionDeclaration } from "@google/genai";

export const listMCPToolsTool: FunctionDeclaration = {
  name: "listMCPTools",
  description:
    "List all available tools from connected MCP (Model Context Protocol) servers. Use this when you need capabilities beyond your native tools - user may have connected external skills like GitHub, Slack, filesystem access, etc. Returns a list of available tools with their descriptions.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
    required: [],
  },
};

export const executeMCPToolTool: FunctionDeclaration = {
  name: "executeMCPTool",
  description:
    "Execute a tool from a connected MCP server. First use 'listMCPTools' to discover available tools, then call this with the server name, tool name, and arguments. This gives you access to external capabilities the user has connected.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      server: {
        type: Type.STRING,
        description:
          "The name/ID of the MCP server to call (from listMCPTools output).",
      },
      tool: {
        type: Type.STRING,
        description: "The name of the tool to execute on that server.",
      },
      args: {
        type: Type.OBJECT,
        description:
          "Arguments to pass to the tool (as key-value pairs matching the tool's expected parameters).",
      },
    },
    required: ["server", "tool"],
  },
};

export const connectToMCPServerTool: FunctionDeclaration = {
  name: "connectToMCPServer",
  description:
    "Connect to a new MCP (Model Context Protocol) server via URL or local command. This allows LUCA to learn new skills from external providers. Supports 'filesystem', 'github', 'brave-search', and more.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      serverUrl: {
        type: Type.STRING,
        description:
          'URL of the MCP server (for remote) or name/command (for local). (e.g., "http://localhost:3000" or "github").',
      },
      name: {
        type: Type.STRING,
        description: "Custom name to identify this server.",
      },
    },
    required: ["serverUrl"],
  },
};

export const ingestMCPServerTool: FunctionDeclaration = {
  name: "ingestMCPServer",
  description:
    "Deeply ingest an MCP server's capabilities and schema. Use this to 'study' a new connection and understand exactly what tools and resources it provides.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      serverName: {
        type: Type.STRING,
        description: "Name of the server to ingest.",
      },
    },
    required: ["serverName"],
  },
};

export const diagnoseMCPHealthTool: FunctionDeclaration = {
  name: "diagnose_mcp_health",
  description:
    "Run a deep diagnostic health check on all connected MCP (Model Context Protocol) servers. This identifies configuration errors, missing environment variables, path issues, and connection latency. Use this if tools from a specific server are failing or if you suspect a configuration issue.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
    required: [],
  },
};
