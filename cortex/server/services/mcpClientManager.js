import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { EventSource } from "eventsource";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MCP_SERVERS_DIR } from "../config/constants.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

global.EventSource = EventSource;

export class MCPClientManager {
    constructor(options = {}) {
        this.clients = new Map(); // Map<urlOrId, { client, tools, resources, lastHealthCheck, retryCount, process }>
        this.defaultTimeout = options.timeout || 30000; // 30 seconds default
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 1000; // 1 second base delay
        this.healthCheckInterval = options.healthCheckInterval || 60000; // 1 minute
    }

    /**
     * Connect to an MCP server with retry logic and better error handling
     * config: { transport: 'sse' | 'stdio', url: string, command: string, args: string[], env: object }
     */
    async connect(config, retryCount = 0) {
        let identifier;
        let transportType = 'sse';
        let headers = {};

        // Parse config
        if (typeof config === 'string') {
            identifier = config;
            transportType = (config.startsWith('http://') || config.startsWith('https://')) ? 'sse' : 'stdio';
        } else {
            identifier = config.id || config.url || config.command;
            transportType = config.transport || 'sse';
            headers = config.headers || {};
        }

        // Check if already connected
        if (this.clients.has(identifier)) {
            const existing = this.clients.get(identifier);
            if (await this.checkHealth(identifier)) {
                return { status: 'already_connected', tools: existing.tools };
            } else {
                console.log(`[MCP] Existing connection to ${identifier} is dead, reconnecting...`);
                await this.disconnect(identifier);
            }
        }

        try {
            console.log(`[MCP] Connecting to: ${identifier} (transport: ${transportType}, attempt ${retryCount + 1}/${this.maxRetries})`);
            
            let transport;
            if (transportType === 'sse') {
                const transportOpts = {};
                if (headers && Object.keys(headers).length > 0) {
                    transportOpts.eventSourceInit = { headers };
                    transportOpts.requestInit = { headers };
                }
                transport = new SSEClientTransport(new URL(identifier), transportOpts);
            } else if (transportType === 'stdio') {
                if (!config.command) throw new Error("Stdio transport requires a 'command'");
                transport = new StdioClientTransport({
                    command: config.command,
                    args: config.args || [],
                    env: { ...process.env, ...(config.env || {}) },
                    stderr: 'pipe' // Prevent inheriting broken file descriptors in Electron
                });
            } else {
                throw new Error(`Unsupported transport type: ${transportType}`);
            }

            const client = new Client({
                name: "luca-client",
                version: "1.0.0",
            }, {
                capabilities: {
                    prompts: {},
                    resources: {},
                    tools: {},
                },
            });

            // Connect with timeout
            const connectPromise = client.connect(transport);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Connection timeout')), this.defaultTimeout)
            );

            await Promise.race([connectPromise, timeoutPromise]);

            // Fetch capabilities with timeout
            const toolsPromise = client.listTools();
            const toolsTimeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Tool discovery timeout')), this.defaultTimeout)
            );

            const toolsList = await Promise.race([toolsPromise, toolsTimeoutPromise]);
            const tools = toolsList.tools || [];

            // Store client info with metadata
            this.clients.set(identifier, {
                client,
                tools,
                transport,
                lastHealthCheck: Date.now(),
                retryCount: 0,
                connectedAt: Date.now()
            });

            console.log(`[MCP] ✓ Connected to ${identifier}. Found ${tools.length} tools.`);
            return { status: 'connected', tools, metadata: { toolCount: tools.length, transport: transportType } };
        } catch (error) {
            console.error(`[MCP] ✗ Failed to connect to ${identifier} (attempt ${retryCount + 1}/${this.maxRetries}):`, error.message);
            
            // Retry logic with exponential backoff
            if (retryCount < this.maxRetries - 1) {
                const delay = this.retryDelay * Math.pow(2, retryCount);
                console.log(`[MCP] Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.connect(config, retryCount + 1);
            }
            
            throw new Error(`Failed to connect to MCP server at ${identifier} after ${this.maxRetries} attempts: ${error.message}`);
        }
    }

    /**
     * Get all tools from all connected MCP servers with enhanced metadata
     */
    getAllTools() {
        const allTools = [];
        for (const [url, data] of this.clients.entries()) {
            data.tools.forEach(tool => {
                allTools.push({
                    ...tool,
                    sourceUrl: url,
                    originalName: tool.name,
                    // Enhanced metadata
                    serverInfo: {
                        url,
                        connectedAt: data.connectedAt,
                        lastHealthCheck: data.lastHealthCheck
                    }
                });
            });
        }
        return allTools;
    }

    /**
     * Execute a tool with better error handling and response formatting
     * @param toolName - Name of the tool to execute
     * @param args - Arguments to pass to the tool
     * @param timeout - Optional timeout in ms
     * @param targetServer - Optional server name/ID to target (for when multiple servers have same tool name)
     */
    async executeTool(toolName, args, timeout = null, targetServer = null) {
        const toolTimeout = timeout || this.defaultTimeout;
        
        // Find which client has this tool
        for (const [url, data] of this.clients.entries()) {
            // If targetServer is specified, only check that server
            if (targetServer && url !== targetServer && !url.includes(targetServer)) {
                continue;
            }
            
            const tool = data.tools.find(t => t.name === toolName);
            if (tool) {
                try {
                    // Check connection health before executing
                    if (!await this.checkHealth(url)) {
                        throw new Error(`Connection to ${url} is not healthy. Please reconnect.`);
                    }

                    const callPromise = data.client.callTool({
                        name: toolName,
                        arguments: args
                    });

                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error(`Tool execution timeout after ${toolTimeout}ms`)), toolTimeout)
                    );

                    const result = await Promise.race([callPromise, timeoutPromise]);
                    
                    // Format response consistently
                    return this.formatResponse(result);
                } catch (error) {
                    console.error(`[MCP] Error executing ${toolName} on ${url}:`, error);
                    
                    // Increment retry count
                    data.retryCount = (data.retryCount || 0) + 1;
                    
                    // If too many failures, mark connection as unhealthy
                    if (data.retryCount > 5) {
                        console.warn(`[MCP] Connection to ${url} has too many failures, marking as unhealthy`);
                    }
                    
                    throw new Error(`MCP Tool Error (${toolName} on ${url}): ${error.message}`);
                }
            }
        }
        
        // Build helpful error message
        const availableTools = this.getAllTools().map(t => `${t.serverInfo?.name || t.sourceUrl}:${t.name}`).join(', ');
        if (targetServer) {
            throw new Error(`Tool "${toolName}" not found on server "${targetServer}". Available tools: ${availableTools}`);
        }
        throw new Error(`Tool "${toolName}" not found in any connected MCP server. Available tools: ${availableTools}`);
    }

    /**
     * Format MCP response consistently
     */
    formatResponse(result) {
        if (!result) {
            return { content: [], error: null };
        }

        // Handle different response formats
        if (result.content && Array.isArray(result.content)) {
            // Standard MCP response format
            const formatted = {
                content: result.content.map(item => {
                    if (typeof item === 'string') {
                        return { type: 'text', text: item };
                    }
                    return item;
                }),
                error: result.error || null
            };
            return formatted;
        } else if (typeof result === 'string') {
            // Simple string response
            return {
                content: [{ type: 'text', text: result }],
                error: null
            };
        } else {
            // Object response - stringify it
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                error: null
            };
        }
    }

    /**
     * Check connection health
     */
    async checkHealth(url) {
        if (!this.clients.has(url)) {
            return false;
        }

        const data = this.clients.get(url);
        const now = Date.now();

        // If health check was recent, assume healthy
        if (data.lastHealthCheck && (now - data.lastHealthCheck) < this.healthCheckInterval) {
            return true;
        }

        try {
            // Try to list tools as a health check
            const toolsPromise = data.client.listTools();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Health check timeout')), 5000)
            );

            await Promise.race([toolsPromise, timeoutPromise]);
            data.lastHealthCheck = now;
            data.retryCount = 0; // Reset retry count on successful health check
            return true;
        } catch (error) {
            console.warn(`[MCP] Health check failed for ${url}:`, error.message);
            return false;
        }
    }

    /**
     * Get connection status for all servers
     */
    getConnectionStatus() {
        const status = [];
        for (const [url, data] of this.clients.entries()) {
            status.push({
                url,
                toolCount: data.tools.length,
                connectedAt: data.connectedAt,
                lastHealthCheck: data.lastHealthCheck,
                retryCount: data.retryCount || 0,
                isHealthy: (Date.now() - (data.lastHealthCheck || 0)) < this.healthCheckInterval
            });
        }
        return status;
    }

    /**
     * Disconnect from an MCP server
     */
    async disconnect(url) {
        if (this.clients.has(url)) {
            const data = this.clients.get(url);
            try {
                // Try to gracefully close the connection if supported
                if (data.client && typeof data.client.close === 'function') {
                    await data.client.close();
                }
            } catch (error) {
                console.warn(`[MCP] Error closing connection to ${url}:`, error.message);
            }
            this.clients.delete(url);
            console.log(`[MCP] Disconnected from ${url}`);
            return true;
        }
        return false;
    }

    /**
     * Disconnect from all servers
     */
    async disconnectAll() {
        const urls = Array.from(this.clients.keys());
        await Promise.all(urls.map(url => this.disconnect(url)));
    }

    /**
     * Get built-in MCP servers that come with Luca
     */
    getBuiltInServers() {
        const projectRoot = path.resolve(__dirname, '../../../');
        const chromeMCPPath = path.join(projectRoot, 'mcp-servers/luca-chrome-mcp/dist/index.js');
        
        return [
            {
                id: 'luca-chrome-mcp',
                name: 'Luca Chrome Browser',
                type: 'stdio',
                command: 'node',
                args: [chromeMCPPath],
                autoConnect: true,
                isBuiltIn: true,
                description: 'AI-powered Chrome browser control'
            }
        ];
    }

    /**
     * Scan the Official Plugin Zone (~/.luca/mcp-servers) for third-party plugins
     */
    getAutoDiscoveredServers() {
        const discovered = [];
        
        if (!fs.existsSync(MCP_SERVERS_DIR)) {
            return discovered;
        }

        try {
            const items = fs.readdirSync(MCP_SERVERS_DIR);
            
            for (const item of items) {
                const itemPath = path.join(MCP_SERVERS_DIR, item);
                if (!fs.statSync(itemPath).isDirectory()) continue;

                // Look for an entry point (index.js or [folder-name].js)
                const possibleEntryPoints = [
                    'index.js',
                    `${item}.js`,
                    'dist/index.js'
                ];

                let entryPoint = null;
                for (const possible of possibleEntryPoints) {
                    const fullPath = path.join(itemPath, possible);
                    if (fs.existsSync(fullPath)) {
                        entryPoint = fullPath;
                        break;
                    }
                }

                if (entryPoint) {
                    discovered.push({
                        id: `auto-${item}`,
                        name: item.split(/[-_]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
                        type: 'stdio',
                        command: 'node',
                        args: [entryPoint],
                        autoConnect: true,
                        isAutoDiscovered: true,
                        description: `Auto-discovered plugin from ${item}`
                    });
                }
            }
        } catch (e) {
            console.error(`[MCP] Discovery Error: ${e.message}`);
        }

        return discovered;
    }

    /**
     * Load servers from settings and auto-connect
     */
    async loadFromSettings(settings) {
        // Load built-in servers and auto-discovered servers first
        const builtInServers = this.getBuiltInServers();
        const autoDiscoveredServers = this.getAutoDiscoveredServers();
        const userServers = settings?.mcp?.servers || [];
        
        // Use a Set to avoid double-loading if a server exists in multiple lists
        const allServers = [...builtInServers, ...autoDiscoveredServers];
        
        // Add user servers that aren't already represented by built-in or auto-discovered
        userServers.forEach(userServer => {
            if (!allServers.find(s => s.id === userServer.id)) {
                allServers.push(userServer);
            }
        });
        
        console.log(`[MCP] Loading ${allServers.length} server(s) (${builtInServers.length} built-in, ${autoDiscoveredServers.length} discovered, ${userServers.length} user)...`);
        
        for (const server of allServers) {
            if (server.autoConnect) {
                try {
                    const config = {
                        id: server.id,
                        transport: server.type,
                        command: server.command,
                        args: server.args || [],
                        url: server.url,
                        env: server.env || {}
                    };
                    await this.connect(config);
                } catch (e) {
                    console.error(`[MCP] Failed to auto-connect to ${server.name}:`, e.message);
                }
            }
        }
    }

    /**
     * Add a new server and persist to settings
     * @param {Object} serverConfig - Server configuration
     * @param {Function} saveSettings - Settings save function
     */
    async addServer(serverConfig, currentSettings, saveSettings) {
        const id = serverConfig.id || `mcp-${Date.now()}`;
        const server = {
            id,
            name: serverConfig.name || id,
            type: serverConfig.type || 'stdio',
            command: serverConfig.command,
            args: serverConfig.args || [],
            url: serverConfig.url,
            env: serverConfig.env || {},
            autoConnect: serverConfig.autoConnect !== false
        };

        // Persist to settings
        const currentServers = currentSettings?.mcp?.servers || [];
        
        // check for duplicates
        const existingIndex = currentServers.findIndex(s => s.id === server.id || (server.url && s.url === server.url));
        
        if (existingIndex >= 0) {
            console.log(`[MCP] Updating existing server: ${server.id}`);
            currentServers[existingIndex] = { ...currentServers[existingIndex], ...server };
        } else {
            currentServers.push(server);
        }
        
        await saveSettings({ mcp: { servers: currentServers } });

        // Connect
        const config = {
            id: server.id,
            transport: server.type,
            command: server.command,
            args: server.args,
            url: server.url,
            env: server.env
        };
        return this.connect(config);
    }

    /**
     * Remove a server by ID
     */
    async removeServer(serverId, currentSettings, saveSettings) {
        await this.disconnect(serverId);
        
        const servers = (currentSettings?.mcp?.servers || []).filter(s => s.id !== serverId);
        await saveSettings({ mcp: { servers } });
        
        return { success: true, removed: serverId };
    }
}

// Singleton export
export const mcpClientManager = new MCPClientManager();
