import { apiUrl } from "../config/api";
import { mentalStateService } from "./mentalStateService";
import { loggerService } from "./loggerService";
import { eventBus } from "./eventBus";

/**
 * OSINT SERVICE (The Archive Bridge)
 * 
 * Synchronizes external forensic investigations with the internal BDI Belief Matrix.
 * Allows LUCA to "Learn" from investigator dossiers.
 */
class OsintService {
    private static instance: OsintService;
    private isSyncing: boolean = false;

    private constructor() {
        console.log("📂 [OSINT_SERVICE] Initialized. Ready for forensic ingestion.");
        this.initializeListeners();
    }

    public static getInstance(): OsintService {
        if (!OsintService.instance) {
            OsintService.instance = new OsintService();
        }
        return OsintService.instance;
    }

    private initializeListeners() {
        // Automatically sync reports when a new mission starts
        eventBus.on("mission:started", () => {
            this.syncInvestigationsToBeliefs();
        });
    }

    /**
     * Periodically syncs investigations found in the OSINT folders into BDI Beliefs.
     */
    public async syncInvestigationsToBeliefs(): Promise<void> {
        if (this.isSyncing) return;
        this.isSyncing = true;

        loggerService.info("OSINT", "Starting Forensic Ingestion Loop...");

        try {
            const listRes = await fetch(apiUrl("/api/osint/investigations/list"));
            if (!listRes.ok) throw new Error("Failed to fetch investigation list");

            const data = await listRes.json();
            const reports = Array.isArray(data) ? data : (data.reports || []);

            // Process top 3 high-risk reports to avoid belief spam
            const highRiskReports = (Array.isArray(reports) ? reports : Object.values(reports))
                .sort((a: any, b: any) => b.riskScore - a.riskScore)
                .slice(0, 3);

            for (const report of highRiskReports) {
                await this.ingestReportAsBelief(report);
            }

            loggerService.info("OSINT", `Forensic Sync Complete. Ingested ${highRiskReports.length} dossiers.`);
        } catch (error: any) {
            loggerService.error("OSINT", `Forensic Sync Error: ${error.message}`);
        } finally {
            this.isSyncing = false;
        }
    }

    private async ingestReportAsBelief(report: any): Promise<void> {
        const beliefId = `forensic-${report.file}`;
        
        // Check if we already have this belief
        if (mentalStateService.beliefs.has(beliefId)) return;

        loggerService.info("OSINT", `Ingesting high-risk target: ${report.target}`);

        mentalStateService.addBelief({
            fact: `TARGET_RECON: ${report.target} has been identified as a high-risk entity (Risk: ${report.riskScore}/100). Source File: ${report.file}. Timestamp: ${new Date(report.timestamp).toLocaleString()}.`,
            confidence: 0.95,
            priority: report.riskScore >= 70 ? 10 : 7,
            source: "sovereign_fact",
            isPersistent: true
        });

        // Emit for immediate UI feedback
        eventBus.emit("osint:dossier-ingested", { target: report.target });
    }
}

export const osintService = OsintService.getInstance();
export default osintService;
