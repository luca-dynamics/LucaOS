import os from 'os';
import { systemControlService } from './systemControlService.js';
import { mcpClientManager } from './mcpClientManager.js';
import {
    canExportSupportSnapshotForBuildType,
    createBackendDoctorSummaryLines,
    createDoctorExecutionResult,
    resolveDoctorMode,
} from '../../../src/shared/diagnostics/doctorSurfaceShared.js';
import {
    createHostSystemSnapshot,
} from '../../../src/shared/diagnostics/diagnosticsContract.js';
import {
    summarizeMcpConnections,
} from '../../../src/shared/diagnostics/mcpDiagnosticsShared.js';

class ServerDiagnosticsService {
    canExportSupportSnapshot(buildType = process.env.VITE_LUCA_BUILD_TYPE || 'PUBLIC') {
        return canExportSupportSnapshotForBuildType(buildType);
    }

    async collectDoctorSnapshot({ reportType = 'audit', scanLevel = 'quick' } = {}) {
        const [status, dependencies, monitor, audit, mcp] = await Promise.all([
            Promise.resolve(systemControlService.getStatus()),
            systemControlService.verifySystemReadiness(),
            systemControlService.getRealtimeStats().catch((error) => ({
                success: false,
                result: error.message,
            })),
            systemControlService.executeCommand({ tool: 'runDiagnostics' }),
            Promise.resolve(this.getMcpSummary()),
        ]);

        return {
            timestamp: Date.now(),
            reportType,
            scanLevel,
            status,
            dependencies,
            monitor,
            audit,
            mcp,
            host: createHostSystemSnapshot(os),
        };
    }

    getMcpSummary() {
        return summarizeMcpConnections(mcpClientManager.getConnectionStatus());
    }

    formatDoctorText(snapshot, { requestedSnapshot = false, snapshotAllowed = false } = {}) {
        return createBackendDoctorSummaryLines(snapshot, {
            requestedSnapshot,
            snapshotAllowed,
        }).join('\n');
    }

    async runDoctor({ reportType = 'audit', scanLevel = 'quick', buildType = process.env.VITE_LUCA_BUILD_TYPE || 'PUBLIC' } = {}) {
        const {
            requestedMode,
            effectiveMode,
            snapshotAllowed,
        } = resolveDoctorMode(reportType, buildType);
        const snapshot = await this.collectDoctorSnapshot({
            reportType: effectiveMode,
            scanLevel,
        });

        return createDoctorExecutionResult({
            effectiveMode,
            text: this.formatDoctorText(snapshot, {
                requestedSnapshot: requestedMode === 'snapshot',
                snapshotAllowed,
            }),
            snapshot,
        });
    }
}

export const serverDiagnosticsService = new ServerDiagnosticsService();
