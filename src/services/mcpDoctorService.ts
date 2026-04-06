/**
 * Sovereign Health Monitor (MCP Doctor) Service
 * 
 * Provides deep diagnostic analysis for MCP capabilities, including
 * configuration validation, environment checks, and remediation logic.
 */

import fs from 'fs';
import { execSync } from 'child_process';
import { mcpClientManager } from './mcpClientManager.js';

export type McpSeverity = 'info' | 'warn' | 'error';

export interface McpFinding {
  blocking: boolean;
  code: string;
  message: string;
  remediation?: string;
  serverName?: string;
  severity: McpSeverity;
  sourcePath?: string;
}

export interface McpLiveCheck {
  attempted: boolean;
  durationMs?: number;
  error?: string;
  result: 'connected' | 'needs-auth' | 'failed' | 'pending' | 'disabled' | 'skipped';
}

export interface McpServerReport {
  serverName: string;
  isHealthy: boolean;
  liveCheck: McpLiveCheck;
  findings: McpFinding[];
}

export interface McpDoctorReport {
  generatedAt: string;
  summary: {
    totalServers: number;
    healthy: number;
    warnings: number;
    blocking: number;
  };
  servers: McpServerReport[];
}

class McpDoctorService {
  /**
   * Run a full health check on all configured MCP servers
   */
  async runFullCheck(): Promise<McpDoctorReport> {
    const status = mcpClientManager.getConnectionStatus();
    const reports: McpServerReport[] = [];

    for (const serverStatus of status) {
      const report = await this.diagnoseServer(serverStatus.url);
      reports.push(report);
    }

    const report: McpDoctorReport = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalServers: reports.length,
        healthy: reports.filter(r => r.isHealthy).length,
        warnings: reports.reduce((acc, r) => acc + r.findings.filter(f => f.severity === 'warn').length, 0),
        blocking: reports.reduce((acc, r) => acc + r.findings.filter(f => f.blocking).length, 0),
      },
      servers: reports,
    };

    return report;
  }

  /**
   * Diagnose a specific server by its identifier
   */
  async diagnoseServer(identifier: string): Promise<McpServerReport> {
    const findings: McpFinding[] = [];
    
    // 1. Basic Connection Health
    const isHealthy = await mcpClientManager.checkHealth(identifier);
    const liveCheck: McpLiveCheck = {
      attempted: true,
      result: isHealthy ? 'connected' : 'failed'
    };

    if (!isHealthy) {
        findings.push({
            blocking: true,
            code: 'health.failed',
            message: `Server "${identifier}" failed its live health check.`,
            remediation: "Check if the server process is crashing or if the URL is accessible.",
            serverName: identifier,
            severity: 'error'
        });
    }

    // 2. Transport Specific Checks
    // - [x] Integrate with `MCPClientManager`
    // - [x] Update `connect()` error handling to trigger a doctor finding
    // - [x] Update `executeTool()` error handling to trigger a doctor finding
    // - [x] Register diagnostic tool
    // - [x] Define `diagnose_mcp_health` tool in `toolRegistry.ts`
    // - [x] Add definition to `mcp.tools.ts`
    // - [x] Verification
    // - [x] Create and run `src/services/mcpDoctor.test.ts`
    // - [x] Manual verification of the health report
    
    return {
      serverName: identifier,
      isHealthy,
      liveCheck,
      findings
    };
  }

  /**
   * Validate a specific configuration object before attempting connection
   */
  async validateConfig(config: any): Promise<McpFinding[]> {
    const findings: McpFinding[] = [];

    if (!config) return findings;

    // Command Check (Stdio)
    if (config.transport === 'stdio' || (config.command && !config.url)) {
        if (!config.command) {
            findings.push({
                blocking: true,
                code: 'config.missing_command',
                message: "Stdio transport is missing the 'command' executable.",
                remediation: "Add a 'command' property (e.g., 'node' or 'python3') to the configuration.",
                severity: 'error'
            });
        } else {
            try {
                // Check if command exists in PATH
                const checkCmd = process.platform === 'win32' ? `where ${config.command}` : `which ${config.command}`;
                execSync(checkCmd, { stdio: 'ignore', shell: true } as any);
            } catch {
                findings.push({
                    blocking: true,
                    code: 'stdio.command_not_found',
                    message: `Executive command "${config.command}" not found in system PATH.`,
                    remediation: `Ensure that "${config.command}" is installed and available in your environment's PATH.`,
                    severity: 'error'
                });
            }
        }

        // Path Check for Args
        if (config.args && Array.isArray(config.args)) {
            for (const arg of config.args) {
                if (typeof arg === 'string' && (arg.includes('/') || arg.includes('\\')) && arg.endsWith('.js')) {
                    if (!fs.existsSync(arg)) {
                        findings.push({
                            blocking: true,
                            code: 'stdio.path_not_found',
                            message: `Script path "${arg}" does not exist.`,
                            remediation: "Verify the absolute path to the MCP server script.",
                            severity: 'error'
                        });
                    }
                }
            }
        }
    }

    // Env Check
    if (config.env) {
        // Logic for expected environment variables can be added here
        // if the service maintains a manifest of required envs for known servers.
    }

    return findings;
  }

  /**
   * Format a report into a human-readable diagnosis string for LUCA's chat
   */
  formatReport(report: McpDoctorReport): string {
    let output = `🩺 **Sovereign Health Report** (${new Date(report.generatedAt).toLocaleString()})\n`;
    output += `Summary: ${report.summary.healthy}/${report.summary.totalServers} Healthy. ${report.summary.blocking} Critical Issues, ${report.summary.warnings} Warnings.\n\n`;

    for (const server of report.servers) {
        const symbol = server.isHealthy ? '✅' : '❌';
        output += `${symbol} **${server.serverName}**\n`;
        
        if (server.findings.length > 0) {
            server.findings.forEach(f => {
                output += `   • [${f.code}] ${f.message}\n`;
                if (f.remediation) output += `     *Remediation*: ${f.remediation}\n`;
            });
        }
    }

    return output;
  }
}

export const mcpDoctorService = new McpDoctorService();
