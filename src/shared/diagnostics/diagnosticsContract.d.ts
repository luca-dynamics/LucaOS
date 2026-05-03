export interface SharedHostSystemSnapshot {
  platform: string;
  arch: string;
  cpus: number;
  freeMem: number;
  totalMem: number;
  uptime: number;
}

export interface SharedAuditResultLike {
  status: "pass" | "warn" | "fail";
}

export declare function createHostSystemSnapshot(osModule: {
  platform(): string;
  arch(): string;
  cpus(): Array<unknown>;
  freemem(): number;
  totalmem(): number;
  uptime(): number;
}): SharedHostSystemSnapshot;

export declare function calculateOverallAuditStatus(
  results?: SharedAuditResultLike[],
): "healthy" | "degraded" | "critical";
